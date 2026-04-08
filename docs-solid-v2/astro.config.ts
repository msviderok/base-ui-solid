import mdx from '@astrojs/mdx';
import solidJs from '@astrojs/solid-js';

import { defineConfig } from 'astro/config';
import rehypePrettyCode from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';
import remarkTypography from 'remark-typography';
import { getSingletonHighlighter } from 'shiki';
import { rehypeConcatHeadings } from './src/plugins/mdx/rehypeConcatHeadings.mjs';
import { rehypeInlineCode } from './src/plugins/mdx/rehypeInlineCode.mjs';
import { rehypeJsxExpressions } from './src/plugins/mdx/rehypeJsxExpressions.mjs';
import { rehypeKbd } from './src/plugins/mdx/rehypeKbd.mjs';
import { rehypePrettierIgnore } from './src/plugins/mdx/rehypePrettierIgnore.mjs';
import { rehypeReference } from './src/plugins/mdx/rehypeReference.mjs';
import { rehypeSlug } from './src/plugins/mdx/rehypeSlug.mjs';
import { rehypeSubtitle } from './src/plugins/mdx/rehypeSubtitle.mjs';
import { demosPlugin } from './src/plugins/vite-demos-plugin';

import sitemap from '@astrojs/sitemap';

// Same Shiki theme as the React and Solid docs
const theme = {
  name: 'base-ui',
  bg: 'var(--color-content)',
  fg: 'var(--syntax-default)',
  settings: [
    {
      scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
      settings: { foreground: 'var(--syntax-comment)' },
    },
    {
      scope: [
        'constant',
        'entity.name.constant',
        'variable.other.constant',
        'variable.other.enummember',
        'variable.language',
      ],
      settings: { foreground: 'var(--syntax-constant)' },
    },
    { scope: ['entity', 'entity.name'], settings: { foreground: 'var(--syntax-entity)' } },
    { scope: 'variable.parameter.function', settings: { foreground: 'var(--syntax-parameter)' } },
    { scope: 'entity.name.tag', settings: { foreground: 'var(--syntax-tag)' } },
    { scope: 'keyword', settings: { foreground: 'var(--syntax-keyword)' } },
    { scope: ['storage', 'storage.type'], settings: { foreground: 'var(--syntax-keyword)' } },
    {
      scope: [
        'string',
        'punctuation.definition.string',
        'string punctuation.section.embedded source',
      ],
      settings: { foreground: 'var(--syntax-string)' },
    },
    { scope: 'support', settings: { foreground: 'var(--syntax-constant)' } },
    { scope: 'variable', settings: { foreground: 'var(--syntax-variable)' } },
    { scope: 'variable.other', settings: { foreground: 'var(--syntax-parameter)' } },
  ],
};

// Pre-create Shiki highlighter with the custom theme registered
const highlighter = await getSingletonHighlighter({
  themes: [theme as any],
  langs: ['tsx', 'jsx', 'css', 'bash', 'json'],
});

// https://astro.build/config
export default defineConfig({
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
      [
        rehypePrettyCode,
        {
          getHighlighter: () => highlighter,
          grid: false,
          theme: 'base-ui',
          defaultLang: 'tsx',
        },
      ],
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
