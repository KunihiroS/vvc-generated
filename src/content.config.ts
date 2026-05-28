import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const slides = defineCollection({
  loader: glob({ base: "./src/content/slides", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    generatedAt: z.coerce.date(),
    tags: z.array(z.string()),
    slideUrl: z.string(),
    kind: z.enum(["slide-html", "visual-summary-deck"]),
    summary: z.string().default(""),
    thumbnailUrl: z.string().nullable().optional(),
    sourceSessionId: z.string().nullable().optional(),
    objectPath: z.string(),
  }),
});

export const collections = { slides };
