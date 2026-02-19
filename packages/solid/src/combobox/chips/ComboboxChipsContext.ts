import { type Accessor, type Setter, createContext, useContext } from 'solid-js';

export interface ComboboxChipsContext {
  highlightedChipIndex: Accessor<number | undefined>;
  setHighlightedChipIndex: Setter<number | undefined>;
  refs: {
    chipsRef: Array<HTMLButtonElement | null | undefined>;
  };
}

export const ComboboxChipsContext = createContext<ComboboxChipsContext | undefined>(undefined);

export function useComboboxChipsContext() {
  return useContext(ComboboxChipsContext);
}
