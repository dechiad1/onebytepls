import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Article content collection schema.
 * Defines the frontmatter structure for all articles.
 */
const articles = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/articles' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      description: z.string(),
      tags: z.array(z.string()).optional().default([]),
      cover_image: image().optional(),
    }),
});

export const collections = { articles };
