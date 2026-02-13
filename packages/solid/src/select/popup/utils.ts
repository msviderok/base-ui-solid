import type { JSX } from 'solid-js';

export function clearStyles(
  element: HTMLElement | null | undefined,
  originalStyles: JSX.CSSProperties,
) {
  if (element) {
    Object.assign(element.style, originalStyles);
  }
}

export const LIST_FUNCTIONAL_STYLES = {
  position: 'relative',
  'max-height': '100%',
  'overflow-x': 'hidden',
  'overflow-y': 'auto',
} as const;
