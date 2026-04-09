import { evaluate, type EvaluateOptions } from '@mdx-js/mdx';
import type { MDXModule } from 'mdx/types';
import { createMemo, createSignal, onMount } from 'solid-js';
import * as jsxRuntime from 'solid-js/h/jsx-runtime';

export function createMdxComponent(
  markdown = '',
  options: Partial<Record<keyof EvaluateOptions, unknown>> = {},
) {
  return function MdxContent() {
    const [mdxModule, setMdxModule] = createSignal<MDXModule>();
    const Content = createMemo(() => mdxModule()?.default ?? null);

    onMount(async () => {
      const module = (await evaluate(markdown, {
        elementAttributeNameCase: 'html',
        stylePropertyNameCase: 'css',
        ...jsxRuntime,
        ...options,
      } as EvaluateOptions)) as MDXModule;

      setMdxModule(module);
    });

    return <>{Content()}</>;
  };
}
