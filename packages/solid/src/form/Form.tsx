import { createEffect, createMemo, createSignal, on, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { access, callEventHandler, splitComponentProps, type ReactLikeRef } from '../solid-helpers';
import { EMPTY_OBJECT } from '../utils/constants';
import {
  createGenericEventDetails,
  type BaseUIGenericEventDetails,
} from '../utils/createBaseUIEventDetails';
import { REASONS } from '../utils/reasons';
import type { BaseUIComponentProps } from '../utils/types';
import { useRenderElement } from '../utils/useRenderElement';
import { FormContext, type Errors } from './FormContext';

/**
 * A native form element with consolidated error handling.
 * Renders a `<form>` element.
 *
 * Documentation: [Base UI Form](https://base-ui.com/react/components/form)
 */
export function Form<FormValues extends Record<string, any> = Record<string, any>>(
  componentProps: Form.Props<FormValues>,
) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'onSubmit',
    'validationMode',
    'errors',
    'onSubmit',
    'onFormSubmit',
    'actionsRef',
  ]);
  const validationMode = () => local.validationMode ?? 'onSubmit';

  const externalErrors = () => local.errors;
  const [formRef, setFormRef] = createStore<FormContext['formRef']>({ fields: {} });

  let submittedRef = false;
  let submitAttemptedRef = false;

  const focusControl = (control: HTMLElement | null | undefined) => {
    if (!control) {
      return;
    }
    control.focus();
    if (control.tagName === 'INPUT') {
      (control as HTMLInputElement).select();
    }
  };

  const [errors, setErrors] = createSignal(externalErrors());

  createEffect(() => {
    setErrors(externalErrors());
  });

  const invalidFields = createMemo(() =>
    Object.values(formRef.fields).filter((field) => field.validityData.state.valid === false),
  );

  createEffect(
    on(invalidFields, (invalid) => {
      if (!submittedRef) {
        return;
      }

      submittedRef = false;

      if (invalid.length) {
        const controlRef = access(invalid[0].controlRef);
        focusControl(controlRef);
      }
    }),
  );

  const handleImperativeValidate = (fieldName?: string | undefined) => {
    const values = Object.values(formRef.fields);

    if (fieldName) {
      const namedField = values.find((field) => field.name === fieldName);
      if (namedField) {
        namedField.validate(false);
      }
    } else {
      values.forEach((field) => {
        field.validate(false);
      });
    }
  };

  onMount(() => {
    if (local.actionsRef) {
      local.actionsRef.current = { validate: handleImperativeValidate };
    }
  });

  const element = useRenderElement('form', componentProps, {
    props: [
      {
        noValidate: true,
        onSubmit(event) {
          submitAttemptedRef = true;

          // Async validation isn't supported to stop the submit event.
          Object.values(formRef.fields).forEach((field) => field.validate());

          if (invalidFields().length) {
            event.preventDefault();
            const controlRef = access(invalidFields()[0].controlRef);
            focusControl(controlRef);
          } else {
            submittedRef = true;
            callEventHandler(local.onSubmit, event as any);

            if (local.onFormSubmit) {
              event.preventDefault();

              const formValues = Object.values(formRef.fields).reduce((acc, field) => {
                if (field.name) {
                  (acc as Record<string, any>)[field.name] = field.getValue();
                }
                return acc;
              }, {} as FormValues);

              local.onFormSubmit?.(formValues, createGenericEventDetails(REASONS.none, event));
            }
          }
        },
      },
      elementProps,
    ],
  });

  const clearErrors = (name: string | undefined) => {
    const err = errors();
    if (name && err && EMPTY_OBJECT.hasOwnProperty.call(err, name)) {
      const nextErrors = { ...err };
      delete nextErrors[name];
      setErrors(nextErrors);
    }
  };

  const contextValue: FormContext = {
    formRef,
    setFormRef,
    validationMode,
    errors: () => errors() ?? EMPTY_OBJECT,
    clearErrors,
    submitAttemptedRef: () => submitAttemptedRef,
  };

  return <FormContext.Provider value={contextValue}>{element()}</FormContext.Provider>;
}

export type FormSubmitEventReason = typeof REASONS.none;
export type FormSubmitEventDetails = BaseUIGenericEventDetails<Form.SubmitEventReason>;

export type FormValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface FormActions {
  validate: (fieldName?: string | undefined) => void;
}

export interface FormState {}

export interface FormProps<
  FormValues extends Record<string, any> = Record<string, any>,
> extends BaseUIComponentProps<'form', Form.State> {
  /**
   * Determines when the form should be validated.
   * The `validationMode` prop on `<Field.Root>` takes precedence over this.
   *
   * - `onSubmit` (default): validates the field when the form is submitted, afterwards fields will re-validate on change.
   * - `onBlur`: validates a field when it loses focus.
   * - `onChange`: validates the field on every change to its value.
   *
   * @default 'onSubmit'
   */
  validationMode?: FormValidationMode | undefined;
  /**
   * Validation errors returned externally, typically after submission by a server or a form action.
   * This should be an object where keys correspond to the `name` attribute on `<Field.Root>`,
   * and values correspond to error(s) related to that field.
   */
  errors?: Errors | undefined;
  /**
   * Event handler called when the form is submitted.
   * `preventDefault()` is called on the native submit event when used.
   */
  onFormSubmit?:
    | ((formValues: FormValues, eventDetails: Form.SubmitEventDetails) => void)
    | undefined;
  /**
   * A ref to imperative actions.
   * - `validate`: Validates all fields when called. Optionally pass a field name to validate a single field.
   * @example
   * ```tsx
   * // validate all fields
   * actionsRef.validate();
   *
   * // validate one field
   * actionsRef.validate('email');
   * ```
   */
  actionsRef?: ReactLikeRef<Form.Actions | null> | undefined;
}

export namespace Form {
  export type Props<FormValues extends Record<string, any> = Record<string, any>> =
    FormProps<FormValues>;
  export type State = FormState;
  export type Actions = FormActions;
  export type ValidationMode = FormValidationMode;
  export type SubmitEventReason = FormSubmitEventReason;
  export type SubmitEventDetails = FormSubmitEventDetails;

  export type Values<FormValues extends Record<string, any> = Record<string, any>> = FormValues;
}
