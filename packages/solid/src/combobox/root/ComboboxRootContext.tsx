import { type Accessor, type ComponentProps, createContext, useContext } from 'solid-js';
import type { FloatingRootContext } from '../../floating-ui-solid';
import { ComboboxStore } from '../store';

export interface ComboboxDerivedItemsContext {
  query: Accessor<string>;
  hasItems: Accessor<boolean>;
  filteredItems: Accessor<any[]>;
  flatFilteredItems: Accessor<any[]>;
}

export const ComboboxRootContext = createContext<{ store: ComboboxStore } | undefined>(undefined);
export const ComboboxFloatingContext = createContext<{ context: FloatingRootContext } | undefined>(
  undefined,
);
export const ComboboxDerivedItemsContext = createContext<ComboboxDerivedItemsContext | undefined>(
  undefined,
);
// `inputValue` can't be placed in the store.
// https://github.com/mui/base-ui/issues/2703
export const ComboboxInputValueContext = createContext<Accessor<ComponentProps<'input'>['value']>>(
  () => '',
);

export function useComboboxRootContext() {
  const context = useContext(ComboboxRootContext) as { store: ComboboxStore } | undefined;
  if (!context) {
    throw new Error(
      'Base UI: ComboboxRootContext is missing. Combobox parts must be placed within <Combobox.Root>.',
    );
  }
  return context;
}

export function useComboboxFloatingContext() {
  const context = useContext(ComboboxFloatingContext);
  if (!context) {
    throw new Error(
      'Base UI: ComboboxFloatingContext is missing. Combobox parts must be placed within <Combobox.Root>.',
    );
  }
  return context;
}

export function useComboboxDerivedItemsContext() {
  const context = useContext(ComboboxDerivedItemsContext);
  if (!context) {
    throw new Error(
      'Base UI: ComboboxItemsContext is missing. Combobox parts must be placed within <Combobox.Root>.',
    );
  }
  return context;
}

export function useComboboxInputValueContext() {
  return useContext(ComboboxInputValueContext);
}
