#!/usr/bin/env tsx
/**
 * Viewport Index — document ingestion CLI.
 *
 * Converts a local .docx, .md, or .mdx file into a fully-formed blog post
 * under src/content/blog/, with frontmatter auto-filled where missing and
 * a guaranteed editorial backlink to https://webese.ai.
 *
 * Usage:
 *   npm run ingest -- path/to/article.docx
 *   npm run ingest -- path/to/article.md --category "Design Systems" --tags "css,layout"
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import slugify from 'slugify';

const CATEGORIES = [
  'UI/UX Architecture',
  'Design Systems',
  'AI Web Technologies',
  'Performance & Core Web Vitals',
  'Frontend Engineering',
] as const;
type Category = (typeof CATEGORIES)[number];

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

interface CliOptions {
  inputPath: string;
  category?: Category;
  tags: string[];
  author?: string;
  outDir: string;
  force: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  const inputPath = args.shift();
  if (!inputPath) {
    console.error('Usage: npm run ingest -- <path-to-doc> [--category "..."] [--tags "a,b,c"] [--author "..."] [--force]');
    process.exit(1);
  }

  const options: CliOptions = {
    inputPath,
    tags: [],
    outDir: path.resolve('src/content/blog'),
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--category') {
      const value = args[++i];
      if (!CATEGORIES.includes(value as Category)) {
        console.error(`Invalid --category "${value}". Must be one of: ${CATEGORIES.join(', ')}`);
        process.exit(1);
      }
      options.category = value as Category;
    } else if (arg === '--tags') {
      options.tags = (args[++i] ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    } else if (arg === '--author') {
      options.author = args[++i];
    } else if (arg === '--force') {
      options.force = true;
    }
  }

  return options;
}

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
function injectBacklink(markdownBody: string): string {
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

function htmlToMarkdown(html: string): string {
  // mammoth output is already clean, semantic HTML. We keep it as raw HTML
  // inside the markdown body, which Astro's markdown pipeline passes through.
  return html
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function convertDocx(inputPath: string): Promise<{ html: string; title?: string }> {
  const mammoth = await import('mammoth');
  const { value: html } = await mammoth.convertToHtml({ path: inputPath });
  return { html };
}

function extractTitleAndDescription(body: string): { title?: string; description?: string; rest: string } {
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ext = path.extname(options.inputPath).toLowerCase();
  const raw = await fs.readFile(options.inputPath, 'utf-8').catch(() => null);

  let frontmatter: Record<string, unknown> = {};
  let body: string;

  if (ext === '.docx') {
    const { html } = await convertDocx(options.inputPath);
    const { title, description, rest } = extractTitleAndDescription(html);
    frontmatter = { title, description };
    body = htmlToMarkdown(rest);
  } else if (ext === '.md' || ext === '.mdx') {
    if (raw === null) throw new Error(`Could not read file: ${options.inputPath}`);
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
    throw new Error(`Unsupported file type "${ext}". Expected .docx, .md, or .mdx.`);
  }

  const title = (frontmatter.title as string) ?? path.basename(options.inputPath, ext);
  const description = ((frontmatter.description as string) ?? '').slice(0, 160) || `${title} — an article from Viewport Index.`;
  const category = options.category ?? (frontmatter.category as Category) ?? 'Frontend Engineering';
  const tags = options.tags.length > 0 ? options.tags : ((frontmatter.tags as string[]) ?? []);
  const author = options.author ?? (frontmatter.author as string) ?? 'Viewport Index Editorial Team';
  const pubDate = (frontmatter.pubDate as string) ?? new Date().toISOString().slice(0, 10);

  const slug = slugify(title, { lower: true, strict: true });
  const outPath = path.join(options.outDir, `${slug}.md`);

  if (!options.force) {
    const exists = await fs
      .access(outPath)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      console.error(`Refusing to overwrite existing post at ${outPath}. Pass --force to overwrite.`);
      process.exit(1);
    }
  }

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

  await fs.mkdir(options.outDir, { recursive: true });
  await fs.writeFile(outPath, fileContents, 'utf-8');

  console.log(`Published: ${outPath}`);
  console.log(`  title:    ${title}`);
  console.log(`  category: ${category}`);
  console.log(`  slug:     ${slug}`);
}

main().catch((error) => {
  console.error('Ingestion failed:', error);
  process.exit(1);
});
