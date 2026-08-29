import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

const entries = await getCollection('blog', ({ data }) => !data.draft);

export const { getStaticPaths, GET } = OGImageRoute({
  param: 'slug',
  pages: Object.fromEntries(entries.map((entry) => [entry.slug, entry])),
  getImageOptions: (_path, entry: (typeof entries)[number]) => ({
    title: entry.data.title,
    description: entry.data.description,
    bgGradient: [[33, 46, 173]],
    border: { color: [59, 99, 245], width: 0 },
    padding: 80,
    fonts: ['./src/assets/og-fonts/WorkSans-Bold.ttf', './src/assets/og-fonts/WorkSans-Regular.ttf'],
    font: {
      title: { size: 64, weight: 'Bold', color: [255, 255, 255], families: ['Work Sans'] },
      description: { size: 32, weight: 'Normal', color: [219, 230, 254], families: ['Work Sans'] },
    },
  }),
});
