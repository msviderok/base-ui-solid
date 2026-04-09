import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const solid = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/solid' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    order: z.number().optional(),
    isNew: z.boolean().optional(),
    isPreview: z.boolean().optional(),
  }),
});

export const collections = { solid };
