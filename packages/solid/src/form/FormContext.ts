import { createContext, useContext, type Accessor } from 'solid-js';
import type { SetStoreFunction, Store } from 'solid-js/store';
import type { FieldValidityData } from '../field/root/FieldRoot';
import type { MaybeAccessor } from '../solid-helpers';
import { NOOP } from '../utils/noop';
import type { Form } from './Form';

export type Errors = Record<string, string | string[]>;

type FormRef = {
  fields: Record<
    string,
    {
      name: string | undefined;
      validate: (flushSync?: boolean | undefined) => void;
      validityData: FieldValidityData;
      controlRef: MaybeAccessor<HTMLElement | null | undefined>;
      getValue: () => unknown;
    }
  >;
};

export interface FormContext {
  errors: Accessor<Errors>;
  clearErrors: (name: string | undefined) => void;
  formRef: Store<FormRef>;
  setFormRef: SetStoreFunction<FormRef>;
  validationMode: Accessor<Form.ValidationMode>;
  submitAttemptedRef: Accessor<boolean>;
}

export const FormContext = createContext<FormContext>({
  formRef: {
    fields: {},
  },
  setFormRef: NOOP,
  errors: () => ({}),
  clearErrors: NOOP,
  validationMode: () => 'onSubmit' as const,
  submitAttemptedRef: () => false,
});

export function useFormContext() {
  return useContext(FormContext);
}
