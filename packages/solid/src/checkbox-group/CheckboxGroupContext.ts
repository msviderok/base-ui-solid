import { createContext, useContext, type Accessor } from 'solid-js';
import type { UseFieldValidationReturnValue } from '../field/root/useFieldValidation';
import type { BaseUIChangeEventDetails } from '../utils/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../utils/reasons';
import { useCheckboxGroupParent } from './useCheckboxGroupParent';

export interface CheckboxGroupContext {
  value: Accessor<string[] | undefined>;
  defaultValue: Accessor<string[] | undefined>;
  setValue: (
    value: string[],
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  allValues: Accessor<string[] | undefined>;
  parent: useCheckboxGroupParent.ReturnValue;
  disabled: Accessor<boolean>;
  validation: UseFieldValidationReturnValue;
  registerControlRef: (element: HTMLButtonElement | null | undefined) => void;
}

export const CheckboxGroupContext = createContext<CheckboxGroupContext>();

export function useCheckboxGroupContext(optional: false): CheckboxGroupContext;
export function useCheckboxGroupContext(optional?: true): CheckboxGroupContext | undefined;
export function useCheckboxGroupContext(optional = true) {
  const context = useContext(CheckboxGroupContext);
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: CheckboxGroupContext is missing. CheckboxGroup parts must be placed within <CheckboxGroup>.',
    );
  }

  return context;
}
