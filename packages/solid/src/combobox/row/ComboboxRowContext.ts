import { createContext, useContext } from 'solid-js';

export const ComboboxRowContext = createContext(false);

export function useComboboxRowContext() {
  return useContext(ComboboxRowContext);
}
