# Viewport Index

An authoritative publication covering UI/UX architecture, design systems, AI web technologies, Core Web Vitals, and frontend engineering — built with Astro, Tailwind CSS, and TypeScript.

## Stack

- **Astro 4**, hybrid output: every page is static except `/admin` and its API route (see below)
- **Tailwind CSS** + `@tailwindcss/typography` for editorial-grade prose styling
- **Content Collections** with a strict Zod schema (`src/content/config.ts`)
- **astro-og-canvas** for per-article OpenGraph image generation
- **@astrojs/sitemap**, `rss.xml`, and JSON-LD (`TechArticle`/`NewsArticle`) for technical SEO
- **@astrojs/vercel** adapter for deployment

## Getting started

```bash
npm install
npm run dev       # http://localhost:4321 — full site, including /admin
npm run build     # type-check + build to .vercel/output/ (Vercel's Build Output API format)
npm run preview   # preview the deployed-shape build locally via `vercel dev`
```

## Deploying

This project deploys to Vercel as-is — import the repo in the Vercel dashboard (or `vercel deploy`) with the default settings; `@astrojs/vercel` in `astro.config.mjs` handles the rest. Framework Preset should auto-detect as **Astro**; if a previous import set it to something else (e.g. Next.js), fix it under Project → Settings → General → Framework Preset.

Everything except `/admin` and `/api/admin/upload` is prerendered to static HTML and served from Vercel's CDN. Those two routes become a Vercel serverless function — but see below, they disable themselves there on purpose.

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

Visit `/admin` while running `npm run dev` for a browser-based upload form: pick a `.docx`/`.md`/`.mdx` file, choose a category from the dropdown, optionally add tags/author, and submit. It's gated by the `ADMIN_UPLOAD_PASSWORD` you set in `.env` and posts to `POST /api/admin/upload` (`src/pages/api/admin/upload.ts`), which runs the same ingestion logic as the CLI (shared in `src/lib/ingest.ts`) and writes the post straight into `src/content/blog/`. The dev server picks it up immediately — no restart needed.

This page and its API route are the only parts of the site that run on a server (`output: 'hybrid'` in `astro.config.mjs`); everything else is still fully static. The page is excluded from `robots.txt` and marked `noindex`.

**It intentionally does nothing when deployed to Vercel.** Both routes check `process.env.VERCEL` (`src/lib/admin-availability.ts`) and, if set, the page shows an "unavailable" message and the API returns 404 instead of attempting an upload. This is deliberate: Vercel's serverless functions run on a fresh, read-only, ephemeral filesystem per invocation, so a write to `src/content/blog/` there would appear to succeed and then vanish — nothing would actually get published. If you want this to work on a real deployment, self-host behind a persistent Node process (e.g. `@astrojs/node` instead of `@astrojs/vercel`) with a writable disk, and commit the written files to git (or move them to a database/CMS) rather than relying on the container's filesystem to persist. Even then, the password check here is a single shared secret with no session or rate-limiting — fine for local use, not something to expose on the open internet as-is.

### Automatic backlink guarantee

Independent of the ingestion CLI, a remark plugin (`src/lib/remark-backlink-injector.mjs`) runs on every Markdown file at build time and applies the same rule — so any post added by hand still receives its editorial backlink to `https://webese.ai`.

## SEO

- Per-article `TechArticle`/`NewsArticle` JSON-LD plus `BreadcrumbList` (`src/layouts/BlogPost.astro`)
- `WebSite` JSON-LD with a `SearchAction` on the homepage
- Auto-generated `sitemap-index.xml` and `robots.txt`
- `rss.xml` feed of all published posts
- Per-post OpenGraph images at `/og/<slug>.png`, rendered locally (no external font fetches) via `astro-og-canvas`
