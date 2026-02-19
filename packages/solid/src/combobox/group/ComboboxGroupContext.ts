import { createContext, useContext, type Accessor, type Setter } from 'solid-js';

export interface ComboboxGroupContext {
  labelId: Accessor<string | undefined>;
  setLabelId: Setter<string | undefined>;
  /**
   * Optional list of items that belong to this group. Used by nested
   * collections to render group-specific items.
   */
  items?: Accessor<readonly any[] | undefined>;
}

export const ComboboxGroupContext = createContext<ComboboxGroupContext | undefined>(undefined);

export function useComboboxGroupContext() {
  const context = useContext(ComboboxGroupContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: ComboboxGroupContext is missing. ComboboxGroup parts must be placed within <Combobox.Group>.',
    );
  }
  return context;
}
