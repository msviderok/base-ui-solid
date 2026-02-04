import { createContext, useContext, type Accessor } from 'solid-js';
import type { TextDirection } from '../../direction-provider';
import type { Orientation } from '../../utils/types';
import type { AccordionRoot, AccordionValue } from './AccordionRoot';

export interface AccordionRootContext {
  accordionItemElements: (HTMLElement | null | undefined)[];
  direction: Accessor<TextDirection>;
  disabled: Accessor<boolean>;
  handleValueChange: (newValue: number | string, nextOpen: boolean) => void;
  hiddenUntilFound: Accessor<boolean>;
  keepMounted: Accessor<boolean>;
  loopFocus: Accessor<boolean>;
  orientation: Accessor<Orientation>;
  state: AccordionRoot.State;
  value: Accessor<AccordionValue>;
}

export const AccordionRootContext = createContext<AccordionRootContext>();

export function useAccordionRootContext() {
  const context = useContext(AccordionRootContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: AccordionRootContext is missing. Accordion parts must be placed within <Accordion.Root>.',
    );
  }
  return context;
}
