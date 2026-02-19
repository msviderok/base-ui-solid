import { createContext, useContext, type Accessor } from 'solid-js';

export const ComboboxPortalContext = createContext<Accessor<boolean | undefined>>(() => undefined);

export function useComboboxPortalContext() {
  const context = useContext(ComboboxPortalContext);
  if (context === undefined) {
    throw new Error('Base UI: <Combobox.Portal> is missing.');
  }
  return context;
}
