import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import { remarkBacklinkInjector } from './src/lib/remark-backlink-injector.mjs';

const SITE_URL = 'https://viewportindex.com';

export default defineConfig({
  site: SITE_URL,
  // Hybrid: every page is static/prerendered by default (fast, cheap to host)
  // except the admin upload page and its API route, which opt out via
  // `export const prerender = false` because they need a real server.
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
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
