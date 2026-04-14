import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    lang: z.enum(['fr', 'en']).default('fr'),
    description: z.string(),
    seoKeywords: z.string().optional(),
    summary: z.array(z.string()).optional(),
    publishedAt: z.coerce.date().optional(),
    author: z.string().optional(),
    category: z.string().optional(),
    image: z.string().optional(),
    status: z.enum(['draft', 'published']).default('draft'),
    featured: z.boolean().default(false),
    faq: z.array(
      z.object({
        question: z.string(),
        answer: z.string().optional(),
      })
    ).optional(),
  }),
});

export const collections = { blog };
