import { createContext, useContext, type Accessor } from 'solid-js';
import type { BaseUIChangeEventDetails } from '../utils/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../utils/reasons';
import type { Orientation } from '../utils/types';

export interface ToggleGroupContext {
  value: Accessor<readonly any[]>;
  setGroupValue: (
    newValue: string,
    nextPressed: boolean,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  disabled: Accessor<boolean>;
  orientation: Accessor<Orientation>;
}

export const ToggleGroupContext = createContext<ToggleGroupContext | undefined>(undefined);

export function useToggleGroupContext(optional = true) {
  const context = useContext(ToggleGroupContext);
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: ToggleGroupContext is missing. ToggleGroup parts must be placed within <ToggleGroup>.',
    );
  }

  return context;
}
