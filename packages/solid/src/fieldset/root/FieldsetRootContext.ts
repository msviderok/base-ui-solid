import { createContext, useContext, type Accessor, type Setter } from 'solid-js';

export interface FieldsetRootContext {
  legendId: Accessor<string | undefined>;
  setLegendId: Setter<string | undefined>;
  disabled: Accessor<boolean | undefined>;
}

export const FieldsetRootContext = createContext<FieldsetRootContext>({
  legendId: () => undefined,
  setLegendId: (() => {}) as any,
  disabled: () => undefined,
});

export function useFieldsetRootContext(optional: true): FieldsetRootContext | undefined;
export function useFieldsetRootContext(optional?: false): FieldsetRootContext;
export function useFieldsetRootContext(optional = false) {
  const context = useContext(FieldsetRootContext);
  if (!context && !optional) {
    throw new Error(
      'Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.',
    );
  }
  return context;
}
