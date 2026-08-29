import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { remarkBacklinkInjector } from './src/lib/remark-backlink-injector.mjs';

const SITE_URL = 'https://viewportindex.com';

export default defineConfig({
  site: SITE_URL,
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
