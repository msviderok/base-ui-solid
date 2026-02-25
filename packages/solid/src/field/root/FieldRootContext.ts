import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import { type SetStoreFunction, type Store } from 'solid-js/store';
import type { Form } from '../../form';
import type { ReactLikeRef } from '../../solid-helpers';
import { EMPTY_OBJECT } from '../../utils/constants';
import { NOOP } from '../../utils/noop';
import { DEFAULT_VALIDITY_STATE } from '../utils/constants';
import type { FieldRoot, FieldValidityData } from './FieldRoot';
import type { UseFieldValidationReturnValue } from './useFieldValidation';

export interface FieldRootContext {
  invalid: Accessor<boolean | undefined>;
  name: Accessor<string | undefined>;
  validityData: Store<FieldValidityData>;
  setValidityData: SetStoreFunction<FieldValidityData>;
  disabled: Accessor<boolean | undefined>;
  touched: Accessor<boolean>;
  setTouched: Setter<boolean>;
  dirty: Accessor<boolean>;
  setDirty: Setter<boolean>;
  filled: Accessor<boolean>;
  setFilled: Setter<boolean>;
  focused: Accessor<boolean>;
  setFocused: Setter<boolean>;
  validate: (
    value: unknown,
    formValues: Record<string, unknown>,
  ) => string | string[] | null | Promise<string | string[] | null>;
  validationMode: Accessor<Form.ValidationMode>;
  validationDebounceTime: Accessor<number>;
  shouldValidateOnChange: () => boolean;
  state: FieldRoot.State;
  markedDirtyRef: ReactLikeRef<boolean>;
  validation: UseFieldValidationReturnValue;
}

export const FieldRootContext = createContext<FieldRootContext>({
  invalid: () => undefined,
  name: () => undefined,
  validityData: {
    state: DEFAULT_VALIDITY_STATE,
    errors: [],
    error: '',
    value: '',
    initialValue: null,
  },
  setValidityData: NOOP,
  disabled: () => undefined,
  touched: () => false,
  setTouched: NOOP as Setter<any>,
  dirty: () => false,
  setDirty: NOOP as Setter<any>,
  filled: () => false,
  setFilled: NOOP as Setter<any>,
  focused: () => false,
  setFocused: NOOP as Setter<any>,
  validate: () => null,
  validationMode: () => 'onSubmit' as const,
  validationDebounceTime: () => 0,
  shouldValidateOnChange: () => false,
  state: {
    disabled: false,
    valid: null,
    touched: false,
    dirty: false,
    filled: false,
    focused: false,
  },
  markedDirtyRef: { current: false },
  validation: {
    getValidationProps: (props = EMPTY_OBJECT) => props,
    getInputValidationProps: (props = EMPTY_OBJECT) => props,
    inputRef: { current: null },
    commit: async () => {},
  },
});

export function useFieldRootContext(optional = true) {
  const context = useContext(FieldRootContext);

  if (context.setValidityData === NOOP && !optional) {
    throw new Error(
      'Base UI: FieldRootContext is missing. Field parts must be placed within <Field.Root>.',
    );
  }

  return context;
}
