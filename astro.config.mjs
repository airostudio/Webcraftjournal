import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import { remarkBacklinkInjector } from './src/lib/remark-backlink-injector.mjs';

const SITE_URL = 'https://viewportindex.com';

// The /admin upload tool writes to the local filesystem, so it only exists
// off Vercel. Vercel builds (VERCEL=1) ship a plain static site with no
// serverless functions, which avoids Vercel's Node runtime requirements.
const includeAdmin = !process.env.VERCEL;

function adminRoutes() {
  return {
    name: 'viewport-admin-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({ pattern: '/admin', entrypoint: './src/admin/AdminPage.astro' });
        injectRoute({ pattern: '/api/admin/upload', entrypoint: './src/admin/upload.ts' });
      },
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  output: includeAdmin ? 'hybrid' : 'static',
  adapter: includeAdmin ? node({ mode: 'standalone' }) : undefined,
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({ filter: (page) => !page.includes('/admin') }),
    ...(includeAdmin ? [adminRoutes()] : []),
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
