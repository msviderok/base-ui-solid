import { createMemo, createSignal, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useFieldsetRootContext } from '../../fieldset/root/FieldsetRootContext';
import type { Form } from '../../form';
import { useFormContext } from '../../form/FormContext';
import { LabelableProvider } from '../../labelable-provider';
import { splitComponentProps, useRef, type Args, type ReactLikeRef } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { DEFAULT_VALIDITY_STATE, fieldValidityMapping } from '../utils/constants';
import { FieldRootContext } from './FieldRootContext';
import { useFieldValidation } from './useFieldValidation';

/**
 * @internal
 */
function FieldRootInner(componentProps: FieldRoot.Props) {
  const { errors, validationMode: formValidationMode, submitAttemptedRef } = useFormContext();

  const [, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'name',
    'validate',
    'validationDebounceTime',
    'validationMode',
    'invalid',
    'dirty',
    'touched',
    'actionsRef',
  ]);
  const validationDebounceTime = () => local.validationDebounceTime ?? 0;
  const validationMode = () => local.validationMode ?? formValidationMode();
  const disabledProp = () => local.disabled ?? false;
  const dirtyProp = () => local.dirty;
  const touchedProp = () => local.touched;

  const { disabled: disabledFieldset } = useFieldsetRootContext();

  const validate = (...args: Args<FieldRoot.Props['validate']>) =>
    local.validate?.(...args) ?? null;

  const disabled = () => disabledFieldset() || disabledProp();

  const [touchedState, setTouchedUnwrapped] = createSignal(false);
  const [dirtyState, setDirtyUnwrapped] = createSignal(false);
  const [filled, setFilled] = createSignal(false);
  const [focused, setFocused] = createSignal(false);

  const dirty = () => dirtyProp() ?? dirtyState();
  const touched = () => touchedProp() ?? touchedState();

  const markedDirtyRef = useRef(false);

  const setDirty: typeof setDirtyUnwrapped = (value) => {
    if (dirtyProp() !== undefined) {
      return;
    }

    if (value) {
      markedDirtyRef.current = true;
    }
    setDirtyUnwrapped(value);
  };

  const setTouched: typeof setTouchedUnwrapped = (value) => {
    if (touchedProp() !== undefined) {
      return;
    }
    setTouchedUnwrapped(value);
  };

  const shouldValidateOnChange = () =>
    validationMode() === 'onChange' || (validationMode() === 'onSubmit' && submitAttemptedRef());

  const invalid = createMemo(() => {
    const err = errors();
    return Boolean(
      local.invalid ||
      (local.name && {}.hasOwnProperty.call(err, local.name) && err[local.name] !== undefined),
    );
  });

  const [validityData, setValidityData] = createStore<FieldValidityData>({
    state: DEFAULT_VALIDITY_STATE,
    error: '',
    errors: [],
    value: null,
    initialValue: null,
  });

  const valid = () => !invalid() && validityData.state.valid;

  const state: FieldRoot.State = {
    get disabled() {
      return disabled();
    },
    get touched() {
      return touched();
    },
    get dirty() {
      return dirty();
    },
    get valid() {
      return valid();
    },
    get filled() {
      return filled();
    },
    get focused() {
      return focused();
    },
  };

  const validation = useFieldValidation({
    setValidityData,
    validate,
    validityData,
    validationDebounceTime,
    invalid,
    markedDirtyRef,
    state,
    name: local.name,
    shouldValidateOnChange,
  });

  const handleImperativeValidate = () => {
    markedDirtyRef.current = true;
    validation.commit(validityData.value);
  };

  onMount(() => {
    if (local.actionsRef) {
      local.actionsRef.current = { validate: handleImperativeValidate };
    }
  });

  const contextValue: FieldRootContext = {
    invalid,
    name: () => local.name,
    validityData,
    setValidityData,
    disabled,
    touched,
    setTouched,
    dirty,
    setDirty,
    filled,
    setFilled,
    focused,
    setFocused,
    validate,
    validationMode,
    validationDebounceTime,
    shouldValidateOnChange,
    markedDirtyRef,
    state,
    validation,
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping: fieldValidityMapping,
  });

  return <FieldRootContext.Provider value={contextValue}>{element()}</FieldRootContext.Provider>;
}

/**
 * Groups all parts of the field.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldRoot(componentProps: FieldRoot.Props) {
  return (
    <LabelableProvider>
      <FieldRootInner {...componentProps} />
    </LabelableProvider>
  );
}

export interface FieldValidityData {
  state: {
    badInput: boolean;
    customError: boolean;
    patternMismatch: boolean;
    rangeOverflow: boolean;
    rangeUnderflow: boolean;
    stepMismatch: boolean;
    tooLong: boolean;
    tooShort: boolean;
    typeMismatch: boolean;
    valueMissing: boolean;
    valid: boolean | null;
  };
  error: string;
  errors: string[];
  value: unknown;
  initialValue: unknown;
}

export interface FieldRootActions {
  validate: () => void;
}

export interface FieldRootState {
  /** Whether the component should ignore user interaction. */
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  valid: boolean | null;
  filled: boolean;
  focused: boolean;
}

export interface FieldRootProps extends BaseUIComponentProps<'div', FieldRoot.State> {
  /**
   * Whether the component should ignore user interaction.
   * Takes precedence over the `disabled` prop on the `<Field.Control>` component.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   * Takes precedence over the `name` prop on the `<Field.Control>` component.
   */
  name?: string | undefined;
  /**
   * A function for custom validation. Return a string or an array of strings with
   * the error message(s) if the value is invalid, or `null` if the value is valid.
   * Asynchronous functions are supported, but they do not prevent form submission
   * when using `validationMode="onSubmit"`.
   */
  validate?:
    | ((
        value: unknown,
        formValues: Form.Values,
      ) => string | string[] | null | Promise<string | string[] | null>)
    | undefined;
  /**
   * Determines when the field should be validated.
   * This takes precedence over the `validationMode` prop on `<Form>`.
   *
   * - `onSubmit`: triggers validation when the form is submitted, and re-validates on change after submission.
   * - `onBlur`: triggers validation when the control loses focus.
   * - `onChange`: triggers validation on every change to the control value.
   *
   * @default 'onSubmit'
   */
  validationMode?: Form.ValidationMode | undefined;
  /**
   * How long to wait between `validate` callbacks if
   * `validationMode="onChange"` is used. Specified in milliseconds.
   * @default 0
   */
  validationDebounceTime?: number | undefined;
  /**
   * Whether the field is invalid.
   * Useful when the field state is controlled by an external library.
   */
  invalid?: boolean | undefined;
  /**
   * Whether the field's value has been changed from its initial value.
   * Useful when the field state is controlled by an external library.
   */
  dirty?: boolean | undefined;
  /**
   * Whether the field has been touched.
   * Useful when the field state is controlled by an external library.
   */
  touched?: boolean | undefined;
  /**
   * A ref to imperative actions.
   * - `validate`: Validates the field when called.
   */
  actionsRef?: ReactLikeRef<FieldRoot.Actions | null> | undefined;
}

export namespace FieldRoot {
  export type State = FieldRootState;
  export type Props = FieldRootProps;
  export type Actions = FieldRootActions;
}
