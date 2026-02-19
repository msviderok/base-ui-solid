import { createContext, useContext, type Accessor } from 'solid-js';

export interface ComboboxChipContext {
  index: Accessor<number>;
}

export const ComboboxChipContext = createContext<ComboboxChipContext | undefined>(undefined);

export function useComboboxChipContext() {
  const context = useContext(ComboboxChipContext);
  if (!context) {
    throw new Error('useComboboxChipContext must be used within a ComboboxChip');
  }
  return context;
}
