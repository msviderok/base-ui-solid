import { createContext, useContext, type Accessor } from 'solid-js';
import type { UseFieldValidationReturnValue } from '../field/root/useFieldValidation';
import type { BaseUIChangeEventDetails } from '../utils/createBaseUIEventDetails';
import { NOOP } from '../utils/noop';
import type { BaseUIEventReasons } from '../utils/reasons';

export interface RadioGroupContext {
  disabled: Accessor<boolean | undefined>;
  readOnly: Accessor<boolean | undefined>;
  required: Accessor<boolean | undefined>;
  name: Accessor<string | undefined>;
  checkedValue: Accessor<unknown>;
  setCheckedValue: (
    value: unknown,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  onValueChange: (
    value: unknown,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  touched: Accessor<boolean>;
  setTouched: (value: boolean) => void;
  validation?: UseFieldValidationReturnValue;
  registerControlRef: (element: HTMLElement | null | undefined) => void;
}

export const RadioGroupContext = createContext<RadioGroupContext>({
  disabled: () => undefined,
  readOnly: () => undefined,
  required: () => undefined,
  name: () => undefined,
  checkedValue: () => '',
  setCheckedValue: NOOP,
  onValueChange: NOOP,
  touched: () => false,
  setTouched: NOOP,
  registerControlRef: NOOP,
});

export function useRadioGroupContext() {
  return useContext(RadioGroupContext);
}
