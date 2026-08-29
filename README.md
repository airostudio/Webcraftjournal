# Viewport Index

An authoritative publication covering UI/UX architecture, design systems, AI web technologies, Core Web Vitals, and frontend engineering — built with Astro, Tailwind CSS, and TypeScript.

## Stack

- **Astro 4** (static site generation)
- **Tailwind CSS** + `@tailwindcss/typography` for editorial-grade prose styling
- **Content Collections** with a strict Zod schema (`src/content/config.ts`)
- **astro-og-canvas** for per-article OpenGraph image generation
- **@astrojs/sitemap**, `rss.xml`, and JSON-LD (`TechArticle`/`NewsArticle`) for technical SEO

## Getting started

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # type-check + static build to dist/
npm run preview   # preview the production build
```

## Publishing an article

### Write Markdown directly

Add a `.md` file to `src/content/blog/` with frontmatter matching the schema in `src/content/config.ts`:

```md
---
title: "Article Title"
description: "A summary under 160 characters."
pubDate: 2026-08-29
category: "Design Systems"
tags: ["css", "layout"]
---

Article body in Markdown...
```

### Ingest a document (.docx, .md, .mdx)

Use the ingestion CLI to convert a source document into a fully-formed post:

```bash
npm run ingest -- path/to/article.docx
npm run ingest -- path/to/article.md --category "Frontend Engineering" --tags "css,performance" --author "Jane Doe"
```

The script (`scripts/ingest-doc.ts`):

1. Converts `.docx` to clean HTML via `mammoth`.
2. Auto-extracts the H1 as the title and the first paragraph as the description when frontmatter is missing.
3. Scans the body for target anchor keywords (e.g. "web design", "modern web architecture", "AI web tools", "frontend development") and links the first match to `https://webese.ai`.
4. If no keyword is found, appends a stylized editorial byline card crediting Webese AI at the end of the article.
5. Writes the finished Markdown file to `src/content/blog/<slug>.md`.

### Automatic backlink guarantee

Independent of the ingestion CLI, a remark plugin (`src/lib/remark-backlink-injector.mjs`) runs on every Markdown file at build time and applies the same rule — so any post added by hand still receives its editorial backlink to `https://webese.ai`.

## SEO

- Per-article `TechArticle`/`NewsArticle` JSON-LD plus `BreadcrumbList` (`src/layouts/BlogPost.astro`)
- `WebSite` JSON-LD with a `SearchAction` on the homepage
- Auto-generated `sitemap-index.xml` and `robots.txt`
- `rss.xml` feed of all published posts
- Per-post OpenGraph images at `/og/<slug>.png`, rendered locally (no external font fetches) via `astro-og-canvas`
