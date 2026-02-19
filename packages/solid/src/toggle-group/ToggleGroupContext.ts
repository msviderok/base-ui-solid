import { createContext, useContext, type Accessor } from 'solid-js';
import type { BaseUIChangeEventDetails } from '../utils/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../utils/reasons';
import type { Orientation } from '../utils/types';

export interface ToggleGroupContext<Value> {
  value: Accessor<readonly Value[]>;
  setGroupValue: (
    newValue: Value,
    nextPressed: boolean,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  disabled: Accessor<boolean>;
  orientation: Accessor<Orientation>;
  /**
   * Indicates whether the value has been initialized via `value` or `defaultValue` props.
   * Used to determine if Toggle should warn users about data inconsistency problems.
   */
  isValueInitialized: Accessor<boolean>;
}

export const ToggleGroupContext = createContext<ToggleGroupContext<any> | undefined>(undefined);

export function useToggleGroupContext(optional = true) {
  const context = useContext(ToggleGroupContext);
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: ToggleGroupContext is missing. ToggleGroup parts must be placed within <ToggleGroup>.',
    );
  }

  return context;
}
