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
import { buildPost, writePost, CATEGORIES, type Category } from '../src/lib/ingest.ts';

interface CliOptions {
  inputPath: string;
  category?: Category;
  tags: string[];
  author?: string;
  force: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  const inputPath = args.shift();
  if (!inputPath) {
    console.error('Usage: npm run ingest -- <path-to-doc> [--category "..."] [--tags "a,b,c"] [--author "..."] [--force]');
    process.exit(1);
  }

  const options: CliOptions = { inputPath, tags: [], force: false };

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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ext = path.extname(options.inputPath).toLowerCase();
  const filename = path.basename(options.inputPath);

  const result = await buildPost({
    filename,
    buffer: await fs.readFile(options.inputPath),
    text: ext === '.md' || ext === '.mdx' ? await fs.readFile(options.inputPath, 'utf-8') : undefined,
    category: options.category,
    tags: options.tags,
    author: options.author,
  });

  await writePost(result, { force: options.force });

  console.log(`Published: ${result.outPath}`);
  console.log(`  title:    ${result.title}`);
  console.log(`  category: ${result.category}`);
  console.log(`  slug:     ${result.slug}`);
}

main().catch((error) => {
  console.error('Ingestion failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
