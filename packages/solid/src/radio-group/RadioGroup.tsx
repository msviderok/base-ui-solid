import {
  batch,
  createEffect,
  createSignal,
  on,
  onCleanup,
  mergeProps as solidMergeProps,
  type Ref,
} from 'solid-js';
import { SHIFT } from '../composite/composite';
import { CompositeRoot } from '../composite/root/CompositeRoot';
import type { FieldRoot } from '../field/root/FieldRoot';
import { useFieldRootContext } from '../field/root/FieldRootContext';
import { useField } from '../field/useField';
import { fieldValidityMapping } from '../field/utils/constants';
import { useFieldsetRootContext } from '../fieldset/root/FieldsetRootContext';
import { contains } from '../floating-ui-solid/utils';
import { useFormContext } from '../form/FormContext';
import { useLabelableContext } from '../labelable-provider/LabelableContext';
import { splitComponentProps } from '../solid-helpers';
import type { BaseUIChangeEventDetails } from '../utils/createBaseUIEventDetails';
import { REASONS } from '../utils/reasons';
import type { BaseUIComponentProps, HTMLProps } from '../utils/types';
import { useBaseUiId } from '../utils/useBaseUiId';
import { useControlled } from '../utils/useControlled';
import { RadioGroupContext } from './RadioGroupContext';

const MODIFIER_KEYS = [SHIFT];

/**
 * Provides a shared state to a series of radio buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio)
 */
export function RadioGroup<Value>(componentProps: RadioGroup.Props<Value>) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'readOnly',
    'required',
    'onValueChange',
    'value',
    'defaultValue',
    'name',
    'inputRef',
    'id',
  ]);

  const disabledProp = () => local.disabled;
  const externalValue = () => local.value;
  const nameProp = () => local.name;
  const idProp = () => local.id;

  const {
    setTouched: setFieldTouched,
    setFocused,
    shouldValidateOnChange,
    validationMode,
    name: fieldName,
    disabled: fieldDisabled,
    state: fieldState,
    validation,
    setDirty,
    setFilled,
    validityData,
  } = useFieldRootContext();
  const { labelId } = useLabelableContext();
  const { clearErrors } = useFormContext();
  const fieldsetContext = useFieldsetRootContext(true);

  const disabled = () => fieldDisabled() || disabledProp();
  const name = () => fieldName() ?? nameProp();
  const id = useBaseUiId(idProp);

  const [checkedValue, setCheckedValueUnwrapped] = useControlled({
    controlled: externalValue,
    default: () => local.defaultValue,
    name: 'RadioGroup',
    state: 'value',
  });

  const setCheckedValue = (value: Value, eventDetails: RadioGroup.ChangeEventDetails) => {
    local.onValueChange?.(value, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setCheckedValueUnwrapped(value);
  };

  let controlRef = null as HTMLElement | null | undefined;
  let groupInputRef = null as HTMLInputElement | null | undefined;
  let firstEnabledInputRef = null as HTMLInputElement | null | undefined;

  function setInputRef(hiddenInput: HTMLInputElement | null | undefined) {
    if (local.inputRef) {
      if (typeof local.inputRef === 'function') {
        const cleanup = () => (local.inputRef as Function)(hiddenInput);
        onCleanup(cleanup);
      } else {
        local.inputRef = hiddenInput;
      }
    }

    groupInputRef = hiddenInput;
    validation.inputRef.current = hiddenInput;
  }

  const registerControlRef = (element: HTMLElement | null | undefined, isDisabled = false) => {
    if (!element) {
      return;
    }

    if (isDisabled) {
      if (controlRef === element) {
        controlRef = null;
      }
      return;
    }

    if (controlRef == null) {
      controlRef = element;
    }
  };

  const registerInputRef = (input: HTMLInputElement | null | undefined) => {
    if (!input || input.disabled) {
      return undefined;
    }

    if (!firstEnabledInputRef) {
      firstEnabledInputRef = input;
    }

    const currentInput = groupInputRef;
    if (input.checked || currentInput == null || currentInput.disabled) {
      return setInputRef(input);
    }

    return undefined;
  };

  useField({
    id,
    commit: validation.commit,
    value: checkedValue,
    controlRef: () => controlRef,
    name,
    getValue: () => checkedValue() ?? null,
  });

  createEffect(
    on(checkedValue, () => {
      batch(() => {
        clearErrors(name());

        setDirty(checkedValue() !== validityData.initialValue);
        setFilled(checkedValue() != null);

        if (shouldValidateOnChange()) {
          validation.commit(checkedValue());
        } else {
          validation.commit(checkedValue(), true);
        }
      });
    }),
  );

  createEffect(() => {
    const fallbackInput = firstEnabledInputRef;
    if (checkedValue() == null && fallbackInput && !fallbackInput.disabled) {
      setInputRef(fallbackInput);
    }
  });

  const [touched, setTouched] = createSignal(false);

  const ariaLabelledby = () =>
    elementProps['aria-labelledby'] ?? labelId() ?? fieldsetContext?.legendId();

  const state: RadioGroup.State = solidMergeProps(fieldState, {
    get disabled() {
      return disabled() ?? false;
    },
    get required() {
      return local.required ?? false;
    },
    get readOnly() {
      return local.readOnly ?? false;
    },
  });

  const contextValue: RadioGroupContext<Value> = solidMergeProps(fieldState, {
    checkedValue,
    disabled,
    validation,
    name,
    onValueChange: local.onValueChange!,
    readOnly: () => local.readOnly,
    required: () => local.required,
    registerControlRef,
    registerInputRef,
    setCheckedValue,
    setTouched,
    touched,
  });

  const defaultProps: HTMLProps = {
    role: 'radiogroup',
    get 'aria-required'() {
      return local.required || undefined;
    },
    get 'aria-disabled'() {
      return disabled() || undefined;
    },
    get 'aria-readonly'() {
      return local.readOnly || undefined;
    },
    get 'aria-labelledby'() {
      return ariaLabelledby();
    },
    onFocus() {
      setFocused(true);
    },
    onBlur(event) {
      if (!contains(event.currentTarget, event.relatedTarget as Element)) {
        setFieldTouched(true);
        setFocused(false);

        if (validationMode() === 'onBlur') {
          validation.commit(checkedValue());
        }
      }
    },
    'on:keydown': {
      capture: true,
      handleEvent(event) {
        if (event.key.startsWith('Arrow')) {
          setFieldTouched(true);
          setTouched(true);
          setFocused(true);
        }
      },
    },
  };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <CompositeRoot
        render={renderProps.render}
        class={renderProps.class}
        state={state}
        props={[defaultProps, validation.getValidationProps, elementProps]}
        refs={[componentProps.ref as any]}
        stateAttributesMapping={fieldValidityMapping}
        enableHomeAndEndKeys={false}
        modifierKeys={MODIFIER_KEYS}
      />
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupState extends FieldRoot.State {
  /**
   * Whether the user should be unable to select a different radio button in the group.
   */
  readOnly: boolean;
  /**
   * Whether the user must tick a radio button within the group before submitting a form.
   */
  required: boolean;
}

export interface RadioGroupProps<Value = any> extends Omit<
  BaseUIComponentProps<'div', RadioGroup.State>,
  'value'
> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user should be unable to select a different radio button in the group.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * The controlled value of the radio item that should be currently selected.
   *
   * To render an uncontrolled radio group, use the `defaultValue` prop instead.
   */
  value?: Value | undefined;
  /**
   * The uncontrolled value of the radio button that should be initially selected.
   *
   * To render a controlled radio group, use the `value` prop instead.
   */
  defaultValue?: Value | undefined;
  /**
   * Callback fired when the value changes.
   */
  onValueChange?: ((value: Value, eventDetails: RadioGroup.ChangeEventDetails) => void) | undefined;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: Ref<HTMLInputElement | null | undefined> | undefined;
}

export type RadioGroupChangeEventReason = typeof REASONS.none;

export type RadioGroupChangeEventDetails = BaseUIChangeEventDetails<RadioGroup.ChangeEventReason>;

export namespace RadioGroup {
  export type State = RadioGroupState;
  export type Props<TValue = any> = RadioGroupProps<TValue>;
  export type ChangeEventReason = RadioGroupChangeEventReason;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
}
