import rehypePrettyCode from 'rehype-pretty-code';
import { getSingletonHighlighter } from 'shiki';
import { rehypeInlineCode } from './mdx/rehypeInlineCode.mjs';
import { rehypeJsxExpressions } from './mdx/rehypeJsxExpressions.mjs';
import { rehypePrettierIgnore } from './mdx/rehypePrettierIgnore.mjs';

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

const highlighter = await getSingletonHighlighter({
  themes: [theme as any],
  langs: ['tsx', 'jsx', 'css', 'bash', 'json'],
});

export const rehypeSyntaxHighlighting = [
  [
    rehypePrettyCode,
    {
      getHighlighter: () => highlighter,
      grid: false,
      theme: 'base-ui',
      defaultLang: 'tsx',
    },
  ],
  rehypePrettierIgnore,
  rehypeJsxExpressions,
  rehypeInlineCode,
];
