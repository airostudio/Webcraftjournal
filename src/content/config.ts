import { defineCollection, z } from 'astro:content';

const CATEGORIES = [
  'UI/UX Architecture',
  'Design Systems',
  'AI Web Technologies',
  'Performance & Core Web Vitals',
  'Frontend Engineering',
] as const;

const blog = defineCollection({
  type: 'content',
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string().max(160, 'Meta description must be 160 characters or fewer.'),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().default('Viewport Index Editorial Team'),
      category: z.enum(CATEGORIES),
      tags: z.array(z.string()).default([]),
      coverImage: z.string().default('/images/covers/default-cover.svg'),
      canonicalUrl: z.string().url().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { blog };
export const CATEGORY_LIST = CATEGORIES;
