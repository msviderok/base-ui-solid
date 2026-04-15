import type { Element, ElementContent, Root as HastRoot, RootContent } from 'hast';
import { toText } from 'hast-util-to-text';
import type { DemoSource, DemoSourceHast, SerializedDemoSource } from './types';

function getElementClassName(element: Element): string | undefined {
  const value = element.properties.className ?? element.properties.class;

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(' ');
  }

  return undefined;
}

function getElementStyle(element: Element): string | undefined {
  const value = element.properties.style;
  return typeof value === 'string' ? value : undefined;
}

function isElement(node: ElementContent): node is Element {
  return node.type === 'element';
}

function isRootElement(node: RootContent): node is Element {
  return node.type === 'element';
}

function isLineElement(node: ElementContent): node is Element {
  return isElement(node) && getElementClassName(node)?.split(/\s+/).includes('line') === true;
}

function normalizeCodeChildren(children: ElementContent[]): ElementContent[] {
  const normalized: ElementContent[] = [];

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];

    if (isLineElement(child) && child.children.length === 0) {
      const next = children[index + 1];
      const newline =
        next?.type === 'text' && /^(?:\r?\n|\r)$/.test(next.value) ? next.value : '\n';

      normalized.push({
        ...child,
        children: [{ type: 'text', value: newline }],
      });

      if (next?.type === 'text' && /^(?:\r?\n|\r)$/.test(next.value)) {
        index += 1;
      }

      continue;
    }

    normalized.push(child);
  }

  return normalized;
}

export function parseDemoSource(source: DemoSource): DemoSourceHast | null {
  if (typeof source === 'string') {
    return null;
  }

  if ('hastJson' in source) {
    return JSON.parse(source.hastJson) as DemoSourceHast;
  }

  return source;
}

export function serializeDemoSource(source: DemoSourceHast): SerializedDemoSource {
  return { hastJson: JSON.stringify(source) };
}

export function normalizeShikiHast(source: HastRoot): DemoSourceHast {
  const pre = source.children.find(isRootElement);

  if (!pre || pre.tagName !== 'pre') {
    throw new Error('Expected a <pre> element in the Shiki HAST tree.');
  }

  const code = pre.children.find(isElement);

  if (!code || code.tagName !== 'code') {
    throw new Error('Expected a <code> element in the Shiki HAST tree.');
  }

  const normalizedCodeChildren = normalizeCodeChildren(code.children);
  const totalLines = code.children.filter(isLineElement).length;
  const frames: Element[] = [
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: 'frame',
        dataFrame: '0',
        dataFrameStartLine: totalLines > 0 ? '1' : '0',
        dataFrameEndLine: String(totalLines),
        dataAsString: toText({ type: 'root', children: code.children }, { whitespace: 'pre' }),
      },
      children: normalizedCodeChildren,
    },
  ];

  return {
    type: 'root',
    data: {
      totalLines,
      preClassName: getElementClassName(pre),
      preStyle: getElementStyle(pre),
    },
    children: frames,
  };
}
