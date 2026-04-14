import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import solidJs from '@astrojs/solid-js';
import { defineConfig } from 'astro/config';
import remarkGfm from 'remark-gfm';
import remarkTypography from 'remark-typography';
import { rehypeConcatHeadings } from './src/lib/mdx/rehypeConcatHeadings.mjs';
import { rehypeInlineCode } from './src/lib/mdx/rehypeInlineCode.mjs';
import { rehypeJsxExpressions } from './src/lib/mdx/rehypeJsxExpressions.mjs';
import { rehypeKbd } from './src/lib/mdx/rehypeKbd.mjs';
import { rehypePrettierIgnore } from './src/lib/mdx/rehypePrettierIgnore.mjs';
import { rehypeReference } from './src/lib/mdx/rehypeReference.mjs';
import { rehypeSlug } from './src/lib/mdx/rehypeSlug.mjs';
import { rehypeSubtitle } from './src/lib/mdx/rehypeSubtitle.mjs';
import { rehypeSyntaxHighlighting } from './src/lib/syntax-highlighting';
import { demosPlugin } from './src/lib/vite-demos-plugin';

// https://astro.build/config
export default defineConfig({
  experimental: {
    contentIntellisense: true,
  },
  integrations: [solidJs(), mdx(), sitemap()],
  vite: {
    plugins: [demosPlugin() as any],
    resolve: {
      alias: {
        '@msviderok/base-ui-solid': new URL('../packages/solid/src', import.meta.url).pathname,
      },
    },
  },
  markdown: {
    syntaxHighlight: false,
    remarkPlugins: [remarkGfm, remarkTypography as any],
    rehypePlugins: [
      rehypeReference as any,
      ...(rehypeSyntaxHighlighting as any),
      rehypePrettierIgnore as any,
      rehypeJsxExpressions as any,
      rehypeInlineCode as any,
      rehypeSlug as any,
      rehypeConcatHeadings as any,
      rehypeSubtitle as any,
      rehypeKbd as any,
    ],
  },
  output: 'static',
});
