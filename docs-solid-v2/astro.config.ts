import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import solidJs from '@astrojs/solid-js';
import { defineConfig } from 'astro/config';
import remarkGfm from 'remark-gfm';
import remarkTypography from 'remark-typography';
import { rehypeConcatHeadings } from './src/plugins/mdx/rehypeConcatHeadings.mjs';
import { rehypeInlineCode } from './src/plugins/mdx/rehypeInlineCode.mjs';
import { rehypeJsxExpressions } from './src/plugins/mdx/rehypeJsxExpressions.mjs';
import { rehypeKbd } from './src/plugins/mdx/rehypeKbd.mjs';
import { rehypePrettierIgnore } from './src/plugins/mdx/rehypePrettierIgnore.mjs';
import { rehypeReference } from './src/plugins/mdx/rehypeReference.mjs';
import { rehypeSlug } from './src/plugins/mdx/rehypeSlug.mjs';
import { rehypeSubtitle } from './src/plugins/mdx/rehypeSubtitle.mjs';
import { demosPlugin } from './src/plugins/vite-demos-plugin';
import { rehypeSyntaxHighlighting } from './src/syntax-highlighting';

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
        '@base-ui/utils': new URL('../packages/utils/src', import.meta.url).pathname,
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
