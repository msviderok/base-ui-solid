import { createContext, useContext, type Accessor } from 'solid-js';

export interface FieldItemContext {
  disabled: Accessor<boolean>;
}

export const FieldItemContext = createContext<FieldItemContext>({ disabled: () => false });

export function useFieldItemContext() {
  const context = useContext(FieldItemContext);

  return context;
}
