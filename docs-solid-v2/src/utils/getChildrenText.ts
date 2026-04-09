import type { JSX } from 'solid-js';

export function getChildrenText(element?: JSX.Element | HTMLCollection): string {
  if (hasChildren(element)) {
    return element.children.length > 0
      ? getChildrenText(element.children)
      : (element.textContent ?? '');
  }

  if (Array.isArray(element)) {
    return element.map(getChildrenText).flat().filter(Boolean).join('');
  }

  if (typeof element === 'string') {
    return element;
  }

  return '';
}

function hasChildren(element?: unknown): element is Element {
  return (
    typeof element === 'object' && !!element && 'children' in element && Boolean(element.children)
  );
}
