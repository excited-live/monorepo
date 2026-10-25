import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import {
	BLOG_REHYPE_PLUGINS,
	BLOG_REMARK_PLUGINS,
} from '@/lib/blog-pipeline';

const remarkPlugins = [...BLOG_REMARK_PLUGINS];
const rehypePlugins = [...BLOG_REHYPE_PLUGINS];

export default defineConfig({
	site: 'https://excited.live',
	redirects: { '/pricing': '/docs/pricing' },
	markdown: {
		processor: unified({
			syntaxHighlight: false,
			remarkPlugins,
			rehypePlugins,
		}),
	},
	integrations: [
		react(),
		mdx({
			extendMarkdownConfig: true,
			syntaxHighlight: false,
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
