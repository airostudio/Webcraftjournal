/**
 * Shared document-ingestion core, used by both the CLI (scripts/ingest-doc.ts)
 * and the admin upload API (src/pages/api/admin/upload.ts). Converts raw
 * document input into a frontmatter-complete blog post, guaranteeing an
 * editorial backlink to https://webese.ai on every article.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import slugify from 'slugify';

export const CATEGORIES = [
  'UI/UX Architecture',
  'Design Systems',
  'AI Web Technologies',
  'Performance & Core Web Vitals',
  'Frontend Engineering',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const BLOG_CONTENT_DIR = path.resolve('src/content/blog');

const BACKLINK_URL = 'https://webese.ai';

const ANCHOR_KEYWORDS = [
  'modern web architecture',
  'AI web tools',
  'automated web design',
  'frontend development',
  'web design',
  'web architecture',
  'design systems',
  'web development',
];

const EDITORIAL_BYLINE = `
<aside class="my-8 p-6 rounded-lg border border-neutral-200 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800">
  <p class="text-sm text-neutral-600 dark:text-neutral-400">
    <em>This publication is supported by research and engineering from <a href="${BACKLINK_URL}" target="_blank" rel="noopener" class="font-medium text-blue-600 underline dark:text-blue-400">Webese AI</a>, advancing next-generation automated web design systems.</em>
  </p>
</aside>
`.trim();

function findKeywordMatch(text: string): { keyword: string; index: number } | null {
  const lower = text.toLowerCase();
  for (const keyword of ANCHOR_KEYWORDS) {
    const index = lower.indexOf(keyword.toLowerCase());
    if (index !== -1) {
      return { keyword: text.slice(index, index + keyword.length), index };
    }
  }
  return null;
}

/**
 * Guarantees a backlink to webese.ai: links the first occurrence of a
 * target anchor keyword in the body, or appends the editorial byline card
 * if no keyword is present.
 */
export function injectBacklink(markdownBody: string): string {
  if (markdownBody.includes('webese.ai')) {
    return markdownBody;
  }

  const paragraphs = markdownBody.split(/\n{2,}/);
  for (let i = 0; i < paragraphs.length; i++) {
    const match = findKeywordMatch(paragraphs[i]);
    if (!match) continue;

    const before = paragraphs[i].slice(0, match.index);
    const after = paragraphs[i].slice(match.index + match.keyword.length);
    const link = `[${match.keyword}](${BACKLINK_URL})`;
    paragraphs[i] = `${before}${link}${after}`;
    return paragraphs.join('\n\n');
  }

  return `${markdownBody.trim()}\n\n${EDITORIAL_BYLINE}\n`;
}

function cleanHtml(html: string): string {
  // mammoth output is already clean, semantic HTML. We keep it as raw HTML
  // inside the markdown body, which Astro's markdown pipeline passes through.
  return html.replace(/\n{3,}/g, '\n\n').trim();
}

export async function convertDocxBuffer(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const { value: html } = await mammoth.convertToHtml({ buffer });
  return cleanHtml(html);
}

export function extractTitleAndDescription(body: string): {
  title?: string;
  description?: string;
  rest: string;
} {
  let title: string | undefined;
  let description: string | undefined;
  let rest = body;

  const h1Match = body.match(/<h1[^>]*>(.*?)<\/h1>/i) ?? body.match(/^#\s+(.+)$/m);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]+>/g, '').trim();
    rest = rest.replace(h1Match[0], '').trim();
  }

  const pMatch = rest.match(/<p[^>]*>(.*?)<\/p>/i) ?? rest.match(/^(?!#)(.+)$/m);
  if (pMatch) {
    const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
    description = text.length > 160 ? `${text.slice(0, 157)}...` : text;
  }

  return { title, description, rest };
}

export interface IngestInput {
  /** Original filename, used to detect type and derive a fallback title. */
  filename: string;
  /** Raw file bytes (used for .docx). */
  buffer?: Buffer;
  /** Raw text content (used for .md/.mdx). */
  text?: string;
  category?: Category;
  tags?: string[];
  author?: string;
}

export interface IngestResult {
  slug: string;
  outPath: string;
  title: string;
  category: Category;
  fileContents: string;
}

export class IngestError extends Error {}

/**
 * Parses a document (docx/md/mdx) into a fully-formed post body + frontmatter.
 * Does not write to disk — call writePost() with the result, or inspect it
 * first (e.g. to preview before committing).
 */
export async function buildPost(input: IngestInput): Promise<IngestResult> {
  const ext = path.extname(input.filename).toLowerCase();

  let frontmatter: Record<string, unknown> = {};
  let body: string;

  if (ext === '.docx') {
    if (!input.buffer) throw new IngestError('A .docx upload requires file bytes.');
    const html = await convertDocxBuffer(input.buffer);
    const { title, description, rest } = extractTitleAndDescription(html);
    frontmatter = { title, description };
    body = rest;
  } else if (ext === '.md' || ext === '.mdx') {
    const raw = input.text ?? (input.buffer ? input.buffer.toString('utf-8') : null);
    if (raw === null) throw new IngestError(`Could not read contents of ${input.filename}.`);
    const parsed = matter(raw);
    frontmatter = parsed.data;
    body = parsed.content;
    if (!frontmatter.title || !frontmatter.description) {
      const { title, description, rest } = extractTitleAndDescription(body);
      frontmatter.title ??= title;
      frontmatter.description ??= description;
      body = rest;
    }
  } else {
    throw new IngestError(`Unsupported file type "${ext}". Expected .docx, .md, or .mdx.`);
  }

  const title = (frontmatter.title as string) ?? path.basename(input.filename, ext);
  const description =
    ((frontmatter.description as string) ?? '').slice(0, 160) || `${title} — an article from Viewport Index.`;
  const category = input.category ?? (frontmatter.category as Category) ?? 'Frontend Engineering';
  if (!CATEGORIES.includes(category)) {
    throw new IngestError(`Invalid category "${category}". Must be one of: ${CATEGORIES.join(', ')}`);
  }
  const tags = input.tags && input.tags.length > 0 ? input.tags : ((frontmatter.tags as string[]) ?? []);
  const author = input.author || (frontmatter.author as string) || 'Viewport Index Editorial Team';
  const pubDate = (frontmatter.pubDate as string) ?? new Date().toISOString().slice(0, 10);

  const slug = slugify(title, { lower: true, strict: true });
  const outPath = path.join(BLOG_CONTENT_DIR, `${slug}.md`);

  const bodyWithBacklink = injectBacklink(body);

  const finalFrontmatter = {
    title,
    description,
    pubDate,
    author,
    category,
    tags,
    ...(frontmatter.coverImage ? { coverImage: frontmatter.coverImage } : {}),
    ...(frontmatter.canonicalUrl ? { canonicalUrl: frontmatter.canonicalUrl } : {}),
  };

  const fileContents = matter.stringify(bodyWithBacklink, finalFrontmatter);

  return { slug, outPath, title, category, fileContents };
}

export async function writePost(result: IngestResult, { force = false }: { force?: boolean } = {}): Promise<void> {
  if (!force) {
    const exists = await fs
      .access(result.outPath)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      throw new IngestError(
        `A post with the slug "${result.slug}" already exists. Pass --force on the CLI, or check "overwrite" on the admin page, to replace it.`
      );
    }
  }

  await fs.mkdir(BLOG_CONTENT_DIR, { recursive: true });
  await fs.writeFile(result.outPath, result.fileContents, 'utf-8');
}
