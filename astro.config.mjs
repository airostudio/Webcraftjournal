import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';
import { remarkBacklinkInjector } from './src/lib/remark-backlink-injector.mjs';

const SITE_URL = 'https://viewportindex.com';

export default defineConfig({
  site: SITE_URL,
  // Hybrid: every page is static/prerendered by default (fast, cheap to host)
  // except the admin upload page and its API route, which opt out via
  // `export const prerender = false`. Those two routes become Vercel
  // serverless functions; everything else ships as static files. The admin
  // route disables itself at runtime when deployed to Vercel (see
  // src/lib/admin-availability.ts) since its filesystem writes won't persist
  // there — it's a local/dev-only tool.
  output: 'hybrid',
  adapter: vercel(),
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [remarkBacklinkInjector],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
