import { type Accessor, createContext, useContext } from 'solid-js';
import type { ReactLikeRef } from '../../solid-helpers';

export interface SelectItemContext {
  selected: Accessor<boolean>;
  indexRef: ReactLikeRef<number>;
  textRef: ReactLikeRef<HTMLElement | null | undefined>;
  selectedByFocus: Accessor<boolean>;
  hasRegistered: Accessor<boolean>;
}

export const SelectItemContext = createContext<SelectItemContext | undefined>(undefined);

export function useSelectItemContext() {
  const context = useContext(SelectItemContext);
  if (!context) {
    throw new Error(
      'Base UI: SelectItemContext is missing. SelectItem parts must be placed within <Select.Item>.',
    );
  }
  return context;
}
