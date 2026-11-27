# Viewport Index

An authoritative publication covering UI/UX architecture, design systems, AI web technologies, Core Web Vitals, and frontend engineering — built with Astro, Tailwind CSS, and TypeScript.

## Stack

- **Astro 4**: a fully static site on Vercel; locally, hybrid output adds the `/admin` upload tool (see below)
- **Tailwind CSS** + `@tailwindcss/typography` for editorial-grade prose styling
- **Content Collections** with a strict Zod schema (`src/content/config.ts`)
- **astro-og-canvas** for per-article OpenGraph image generation
- **@astrojs/sitemap**, `rss.xml`, and JSON-LD (`TechArticle`/`NewsArticle`) for technical SEO

## Getting started

```bash
npm install
npm run dev       # http://localhost:4321 — full site, including /admin
npm run build     # type-check + build (hybrid + Node adapter locally, plain static on Vercel)
npm run preview   # preview the local build
```

## Deploying

Import the repo in Vercel with Framework Preset **Astro** and default build settings. When Vercel builds (it sets `VERCEL=1`), `astro.config.mjs` switches to `output: 'static'` with no adapter and leaves the admin routes out entirely, so the deployment is plain static files in `dist/` with no serverless functions. That also means Vercel's Node.js runtime version only affects the build step; any version Vercel currently supports works.

## Setup

Copy `.env.example` to `.env` and set a password for the admin upload page:

```bash
cp .env.example .env
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

### Admin upload page (local/dev only)

Visit `/admin` while running `npm run dev` for a browser-based upload form: pick a `.docx`/`.md`/`.mdx` file, choose a category from the dropdown, optionally add tags/author, and submit. It's gated by the `ADMIN_UPLOAD_PASSWORD` you set in `.env` and posts to `POST /api/admin/upload` (`src/admin/upload.ts`), which runs the same ingestion logic as the CLI (shared in `src/lib/ingest.ts`) and writes the post straight into `src/content/blog/`. The dev server picks it up immediately — no restart needed.

The two routes live in `src/admin/` (not `src/pages/`) and are added by a small integration in `astro.config.mjs` only when not building on Vercel; locally that build uses `output: 'hybrid'` with the `@astrojs/node` adapter. The page is excluded from `robots.txt`, the sitemap, and marked `noindex`.

**The admin routes don't exist on Vercel** (they return 404). That's deliberate: they write to `src/content/blog/` on disk, and a hosted deployment's filesystem wouldn't keep those writes. Publish by running the admin page locally, then committing and pushing the new post. The push triggers a Vercel rebuild. The password check is a single shared secret with no session or rate-limiting, which is fine locally but not something to expose publicly.

### Automatic backlink guarantee

Independent of the ingestion CLI, a remark plugin (`src/lib/remark-backlink-injector.mjs`) runs on every Markdown file at build time and applies the same rule — so any post added by hand still receives its editorial backlink to `https://webese.ai`.

## SEO

- Per-article `TechArticle`/`NewsArticle` JSON-LD plus `BreadcrumbList` (`src/layouts/BlogPost.astro`)
- `WebSite` JSON-LD with a `SearchAction` on the homepage
- Auto-generated `sitemap-index.xml` and `robots.txt`
- `rss.xml` feed of all published posts
- Per-post OpenGraph images at `/og/<slug>.png`, rendered locally (no external font fetches) via `astro-og-canvas`
