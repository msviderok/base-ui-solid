import { combineStyle } from '@msviderok/base-ui-solid/merge-props';
import clsx from 'clsx';
import type { ElementContent, Root as HastRoot } from 'hast';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { toText } from 'hast-util-to-text';
import {
  For,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  splitProps,
  type ComponentProps,
  type JSX,
} from 'solid-js';
import * as jsxRuntime from 'solid-js/h/jsx-runtime';
import { parseDemoSource } from './demoSourceUtils';
import type { DemoSource, DemoSourceHast } from './types';

const textChildrenCache = new WeakMap<ElementContent[], string>();

function hastToJsx(hast: HastRoot | ElementContent): JSX.Element {
  return toJsxRuntime(hast as HastRoot, jsxRuntime);
}

function renderCode(hastChildren: ElementContent[], renderHast?: boolean, text?: string) {
  if (renderHast) {
    return hastToJsx({ type: 'root', children: hastChildren });
  }

  if (text !== undefined) {
    return text;
  }

  let txt = textChildrenCache.get(hastChildren);

  if (!txt) {
    txt = toText({ type: 'root', children: hastChildren }, { whitespace: 'pre' });
    textChildrenCache.set(hastChildren, txt);
  }

  return txt;
}

function getClassName(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(' ');
  }

  return undefined;
}

function isFrameClass(value: unknown) {
  return getClassName(value) === 'frame';
}

function assignRef(ref: ComponentProps<'pre'>['ref'], value: HTMLPreElement) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref && typeof ref === 'object') {
    (ref as { current?: HTMLPreElement }).current = value;
  }
}

export function DemoSourceRenderer(props: DemoSourceRenderer.Props) {
  const [local, other] = splitProps(props, [
    'source',
    'language',
    'hydrateMargin',
    'shouldHighlight',
    'ref',
    'class',
    'style',
  ]);

  const [rootElement, setRootElement] = createSignal<HTMLPreElement>();
  const [visibleFrames, setVisibleFrames] = createSignal<Record<number, boolean>>({ 0: true });
  let observer: IntersectionObserver | null = null;

  const hast = createMemo<DemoSourceHast | null>(() => parseDemoSource(local.source));
  const preClassName = createMemo(() => hast()?.data?.preClassName);
  const preStyle = createMemo(() => hast()?.data?.preStyle);

  createEffect(
    on(
      () => local.source,
      () => {
        setVisibleFrames({ 0: true });
      },
    ),
  );

  createEffect(() => {
    const root = rootElement();
    const hastRoot = hast();

    if (!root || !hastRoot) {
      return;
    }

    observer?.disconnect();
    const scrollRoot = root.closest<HTMLElement>('.ScrollAreaViewport');
    observer = new IntersectionObserver(
      (entries) =>
        setVisibleFrames((prev) => {
          const visible: number[] = [];

          entries.forEach((entry) => {
            const frame = Number(entry.target.getAttribute('data-frame'));

            if (Number.isNaN(frame)) {
              return;
            }

            if (entry.isIntersecting) {
              visible.push(frame);
            }
          });

          let frames: Record<number, boolean> | undefined;

          visible.forEach((frame) => {
            if (prev[frame] !== true) {
              if (!frames) {
                frames = { ...prev };
              }

              frames[frame] = true;
            }
          });

          return frames ?? prev;
        }),
      {
        root: scrollRoot,
        rootMargin: local.hydrateMargin ?? '200px 0px 200px 0px',
      },
    );

    // root.querySelectorAll('[data-frame]').forEach((node) => {
    //   observer?.observe(node);
    // });

    onCleanup(() => {
      observer?.disconnect();
      observer = null;
    });
  });

  const setCombinedRef = (node: HTMLPreElement) => {
    setRootElement(node);
    assignRef(local.ref, node);
  };

  return (
    <pre
      {...other}
      ref={setCombinedRef}
      class={clsx(preClassName(), local.class)}
      style={combineStyle(preStyle(), local.style)}
    >
      <code class={local.language ? `language-${local.language}` : undefined}>
        {typeof local.source === 'string' ? (
          local.source
        ) : (
          <For each={hast()?.children ?? []}>
            {(child, index) => {
              if (child.type !== 'element') {
                if (child.type === 'text') {
                  return <span data-non-frame>{child.value}</span>;
                }

                return null;
              }

              if (isFrameClass(child.properties.className ?? child.properties.class)) {
                const isVisible = Boolean(visibleFrames()[index()]);
                const shouldRenderHast = (local.shouldHighlight ?? true) && isVisible;

                return (
                  <span
                    class="frame"
                    data-frame={index()}
                    data-lined={shouldRenderHast ? '' : undefined}
                    data-frame-type={
                      child.properties.dataFrameType
                        ? String(child.properties.dataFrameType)
                        : undefined
                    }
                    data-frame-indent={
                      child.properties.dataFrameIndent != null
                        ? String(child.properties.dataFrameIndent)
                        : undefined
                    }
                    data-frame-start-line={
                      child.properties.dataFrameStartLine != null
                        ? String(child.properties.dataFrameStartLine)
                        : undefined
                    }
                    data-frame-end-line={
                      child.properties.dataFrameEndLine != null
                        ? String(child.properties.dataFrameEndLine)
                        : undefined
                    }
                  >
                    {renderCode(
                      child.children,
                      shouldRenderHast,
                      child.properties.dataAsString
                        ? String(child.properties.dataAsString)
                        : undefined,
                    )}
                  </span>
                );
              }

              return (
                <span data-non-frame>
                  {(local.shouldHighlight ?? true)
                    ? hastToJsx(child)
                    : toText(child, { whitespace: 'pre' })}
                </span>
              );
            }}
          </For>
        )}
      </code>
    </pre>
  );
}

export namespace DemoSourceRenderer {
  export interface Props extends ComponentProps<'pre'> {
    source: DemoSource;
    language?: string;
    shouldHighlight?: boolean;
    hydrateMargin?: string;
  }
}
