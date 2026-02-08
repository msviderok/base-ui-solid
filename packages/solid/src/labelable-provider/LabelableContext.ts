'use client';
import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import { NOOP } from '../utils/noop';
import type { BaseUIHTMLProps, HTMLProps } from '../utils/types';

export interface LabelableContext {
  /**
   * The `id` of the labelable element.
   * When `null` the association is implicit.
   */
  controlId: Accessor<string | null | undefined>;
  setControlId: Setter<string | null | undefined>;
  /**
   * The `id` of the label.
   */
  labelId: Accessor<string | undefined>;
  setLabelId: Setter<string | undefined>;
  /**
   * An array of `id`s of elements that provide an accessible description.
   */
  messageIds: Accessor<string[]>;
  setMessageIds: Setter<string[]>;
  getDescriptionProps: (externalProps: HTMLProps | BaseUIHTMLProps) => BaseUIHTMLProps;
}

/**
 * A context for providing [labelable elements](https://html.spec.whatwg.org/multipage/forms.html#category-label)\
 * with an accessible name (label) and description.
 */
export const LabelableContext = createContext<LabelableContext>({
  controlId: () => undefined,
  setControlId: NOOP as Setter<string | null | undefined>,
  labelId: () => undefined,
  setLabelId: NOOP as Setter<string | undefined>,
  messageIds: () => [],
  setMessageIds: NOOP as Setter<string[]>,
  getDescriptionProps: (externalProps) => externalProps,
});

export function useLabelableContext() {
  return useContext(LabelableContext);
}
