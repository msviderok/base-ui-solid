import { createContext, useContext, type Accessor } from 'solid-js';
import type { ReactLikeRef } from '../../solid-helpers';

export interface ComboboxItemContext {
  selected: Accessor<boolean>;
  textRef: ReactLikeRef<HTMLElement | null | undefined>;
}

export const ComboboxItemContext = createContext<ComboboxItemContext | undefined>(undefined);

export function useComboboxItemContext() {
  const context = useContext(ComboboxItemContext);
  if (!context) {
    throw new Error(
      'Base UI: ComboboxItemContext is missing. ComboboxItem parts must be placed within <Combobox.Item>.',
    );
  }
  return context;
}
