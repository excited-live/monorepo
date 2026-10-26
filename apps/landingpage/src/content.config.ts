import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './content/docs' }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		/** Thai H1. The docs shell has one tree, so the sidebar stays the English
		 * title; this only swaps the page heading a reader lands on. */
		titleTh: z.string().optional(),
		/** Thai standfirst under the H1, same rule as `titleTh`. */
		descriptionTh: z.string().optional(),
		icon: z.string().optional(),
	}),
});

const meta = defineCollection({
	loader: glob({ pattern: '**/*.{json,yaml}', base: './content/docs' }),
	schema: z.object({
		title: z.string().optional(),
		description: z.string().optional(),
		pages: z.array(z.string()).optional(),
		icon: z.string().optional(),
	}),
});

const blog = defineCollection({
	// Top-level posts only (`*.md`) — README.md etc. are not posts.
	loader: glob({ pattern: '*.md', base: './content/blog' }),
	schema: z.object({
		title: z.string(),
		// Post date (YYYY-MM-DD). Drives ordering + display.
		date: z.coerce.date(),
		description: z.string().optional(),
		// YouTube video id (the part after watch?v=). When present, the blog
		// post embeds the video at the top with a "watch instead of read" hint.
		youtube: z
			.string()
			.regex(/^[A-Za-z0-9_-]{11}$/, 'YouTube video id must be the 11-char id after watch?v=')
			.optional(),
		draft: z.boolean().default(false),
	}),
});

export const collections = {
	docs,
	meta,
	blog,
};
