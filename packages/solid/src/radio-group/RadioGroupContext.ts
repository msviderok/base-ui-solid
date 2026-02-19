import { createContext, useContext, type Accessor } from 'solid-js';
import type { UseFieldValidationReturnValue } from '../field/root/useFieldValidation';
import type { BaseUIChangeEventDetails } from '../utils/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../utils/reasons';

export interface RadioGroupContext<Value> {
  disabled: Accessor<boolean | undefined>;
  readOnly: Accessor<boolean | undefined>;
  required: Accessor<boolean | undefined>;
  name: Accessor<string | undefined>;
  checkedValue: Accessor<Value | undefined>;
  setCheckedValue: (
    value: Value,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  onValueChange: (
    value: Value,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  touched: Accessor<boolean>;
  setTouched: (value: boolean) => void;
  validation?: UseFieldValidationReturnValue | undefined;
  registerControlRef: (element: HTMLElement | null | undefined, disabled?: boolean) => void;
  registerInputRef: (element: HTMLInputElement | null | undefined) => void;
}

export const RadioGroupContext = createContext<RadioGroupContext<any> | undefined>(undefined);

export function useRadioGroupContext() {
  return useContext(RadioGroupContext);
}
