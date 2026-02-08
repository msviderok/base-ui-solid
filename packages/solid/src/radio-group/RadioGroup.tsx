import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
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
import { mergeProps } from '../merge-props';
import { splitComponentProps } from '../solid-helpers';
import type { BaseUIChangeEventDetails } from '../utils/createBaseUIEventDetails';
import { REASONS } from '../utils/reasons';
import type { BaseUIComponentProps, HTMLProps } from '../utils/types';
import { useBaseUiId } from '../utils/useBaseUiId';
import { useControlled } from '../utils/useControlled';
import { visuallyHiddenInput } from '../utils/visuallyHidden';
import { RadioGroupContext } from './RadioGroupContext';

const MODIFIER_KEYS = [SHIFT];

/**
 * Provides a shared state to a series of radio buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio)
 */
export function RadioGroup(componentProps: RadioGroup.Props) {
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

  const setCheckedValue = (value: unknown, eventDetails: RadioGroup.ChangeEventDetails) => {
    local.onValueChange?.(value, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setCheckedValueUnwrapped(value);
  };

  let controlRef = null as HTMLElement | null | undefined;
  const registerControlRef = (element: HTMLElement | null | undefined) => {
    if (controlRef == null && element != null) {
      controlRef = element;
    }
  };

  useField({
    id,
    commit: validation.commit,
    value: checkedValue,
    controlRef,
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

  const [touched, setTouched] = createSignal(false);

  const onBlur = (event: FocusEvent) => {
    batch(() => {
      if (!contains(event.currentTarget as Element, event.relatedTarget as Element)) {
        setFieldTouched(true);
        setFocused(false);

        if (validationMode() === 'onBlur') {
          validation.commit(checkedValue());
        }
      }
    });
  };

  const onKeyDownCapture = (event: KeyboardEvent) => {
    if (event.key.startsWith('Arrow')) {
      batch(() => {
        setFieldTouched(true);
        setTouched(true);
        setFocused(true);
      });
    }
  };

  const serializedCheckedValue = createMemo<string>(() => {
    if (checkedValue() == null) {
      return ''; // avoid uncontrolled -> controlled error
    }
    if (typeof checkedValue() === 'string') {
      return checkedValue() as string;
    }

    return JSON.stringify(checkedValue());
  });

  const inputProps = createMemo(() =>
    mergeProps<'input'>(
      {
        value: serializedCheckedValue(),
        ref: (el) => {
          if (typeof local.inputRef === 'function') {
            local.inputRef(el);
          } else {
            local.inputRef = el;
          }
          validation.inputRef = el;
        },
        id: id(),
        name: serializedCheckedValue() ? name() : undefined,
        disabled: disabled(),
        readOnly: local.readOnly,
        required: local.required,
        'aria-labelledby': elementProps['aria-labelledby'] ?? fieldsetContext?.legendId(),
        'aria-hidden': true,
        tabIndex: -1,
        style: visuallyHiddenInput,
        onFocus() {
          controlRef?.focus();
        },
      },
      validation.getInputValidationProps,
    ),
  );

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

  const contextValue: RadioGroupContext = solidMergeProps(fieldState, {
    checkedValue,
    disabled,
    validation,
    name,
    onValueChange: local.onValueChange!,
    readOnly: () => local.readOnly,
    required: () => local.required,
    registerControlRef,
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
      return labelId();
    },
    onFocus() {
      setFocused(true);
    },
    onBlur,
    'on:keydown': {
      capture: true,
      handleEvent: onKeyDownCapture,
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
      <input {...(inputProps() as any)} />
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupState extends FieldRoot.State {
  /**
   * Whether the user should be unable to select a different radio button in the group.
   */
  readOnly: boolean | undefined;
}

export interface RadioGroupProps extends Omit<
  BaseUIComponentProps<'div', RadioGroup.State>,
  'value'
> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean;
  /**
   * Whether the user should be unable to select a different radio button in the group.
   * @default false
   */
  readOnly?: boolean;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string;
  /**
   * The controlled value of the radio item that should be currently selected.
   *
   * To render an uncontrolled radio group, use the `defaultValue` prop instead.
   */
  value?: any;
  /**
   * The uncontrolled value of the radio button that should be initially selected.
   *
   * To render a controlled radio group, use the `value` prop instead.
   */
  defaultValue?: any;
  /**
   * Callback fired when the value changes.
   */
  onValueChange?: (value: any, eventDetails: RadioGroup.ChangeEventDetails) => void;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: Ref<HTMLInputElement>;
}

export type RadioGroupChangeEventReason = typeof REASONS.none;

export type RadioGroupChangeEventDetails = BaseUIChangeEventDetails<RadioGroup.ChangeEventReason>;

export namespace RadioGroup {
  export type State = RadioGroupState;
  export type Props = RadioGroupProps;
  export type ChangeEventReason = RadioGroupChangeEventReason;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
}
