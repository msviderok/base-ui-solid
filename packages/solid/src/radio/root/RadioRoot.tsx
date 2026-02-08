import { batch, onMount, Show, mergeProps as solidMergeProps, type JSX, type Ref } from 'solid-js';
import { ACTIVE_COMPOSITE_ITEM } from '../../composite/constants';
import { CompositeItem } from '../../composite/item/CompositeItem';
import { useFieldItemContext } from '../../field/item/FieldItemContext';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { useRadioGroupContext } from '../../radio-group/RadioGroupContext';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { NOOP } from '../../utils/noop';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, NonNativeButtonProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { visuallyHiddenInput } from '../../utils/visuallyHidden';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { RadioRootContext } from './RadioRootContext';

/**
 * Represents the radio button itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export function RadioRoot(componentProps: RadioRoot.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'readOnly',
    'required',
    'value',
    'inputRef',
    'nativeButton',
    'id',
  ]);

  const disabledProp = () => local.disabled ?? false;
  const readOnlyProp = () => local.readOnly ?? false;
  const requiredProp = () => local.required ?? false;
  const nativeButton = () => local.nativeButton ?? false;
  const idProp = () => local.id;

  const {
    disabled: disabledGroup,
    readOnly: readOnlyGroup,
    required: requiredGroup,
    checkedValue,
    setCheckedValue,
    touched,
    setTouched,
    validation,
    registerControlRef,
  } = useRadioGroupContext();

  const {
    setDirty,
    validityData,
    setTouched: setFieldTouched,
    setFilled,
    state: fieldState,
    disabled: fieldDisabled,
  } = useFieldRootContext();
  const fieldItemContext = useFieldItemContext();
  const { labelId, getDescriptionProps } = useLabelableContext();

  const disabled = () =>
    fieldDisabled() || fieldItemContext.disabled() || disabledGroup() || disabledProp();
  const readOnly = () => readOnlyGroup() || readOnlyProp();
  const required = () => requiredGroup() || requiredProp();

  const checked = () => checkedValue() === local.value;

  let radioRef = null as HTMLElement | null | undefined;
  let inputRef = null as HTMLInputElement | null | undefined;

  onMount(() => {
    if (inputRef?.checked) {
      setFilled(true);
    }
  });

  const id = useBaseUiId();
  const inputId = useLabelableId({
    id: idProp,
    implicit: false,
    controlRef: radioRef,
  });
  const hiddenInputId = () => (nativeButton() ? undefined : inputId());

  const rootProps: JSX.HTMLAttributes<HTMLButtonElement> = {
    role: 'radio',
    get 'aria-checked'() {
      return checked();
    },
    get 'aria-required'() {
      return required() || undefined;
    },
    get 'aria-readonly'() {
      return readOnly() || undefined;
    },
    get 'aria-labelledby'() {
      return labelId();
    },
    get [ACTIVE_COMPOSITE_ITEM as string]() {
      return checked() ? '' : undefined;
    },
    get id() {
      return nativeButton() ? inputId() : id();
    },
    onKeyDown(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
      }
    },
    onClick(event) {
      if (event.defaultPrevented || disabled() || readOnly()) {
        return;
      }

      event.preventDefault();

      inputRef?.click();
    },
    onFocus(event) {
      if (event.defaultPrevented || disabled() || readOnly() || !touched()) {
        return;
      }

      inputRef?.click();

      setTouched(false);
    },
  };

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const inputProps: JSX.InputHTMLAttributes<HTMLInputElement> = {
    type: 'radio',
    ref: (el) => {
      if (typeof local.inputRef === 'function') {
        local.inputRef(el);
      } else {
        local.inputRef = el;
      }
      inputRef = el;
    },
    get id() {
      return hiddenInputId();
    },
    tabIndex: -1,
    style: visuallyHiddenInput,
    'aria-hidden': true,
    get disabled() {
      return disabled();
    },
    get checked() {
      return checked();
    },
    get required() {
      return required();
    },
    get readOnly() {
      return readOnly();
    },
    onChange(event) {
      // Workaround for https://github.com/facebook/react/issues/9023
      if (event.defaultPrevented) {
        return;
      }

      if (disabled() || readOnly() || local.value === undefined) {
        return;
      }

      const details = createChangeEventDetails(REASONS.none, event);

      if (details.isCanceled) {
        return;
      }

      batch(() => {
        setFieldTouched(true);
        setDirty(local.value !== validityData.initialValue);
        setFilled(true);
        setCheckedValue(local.value, details);
      });
    },
    onFocus() {
      radioRef?.focus();
    },
  };

  const state: RadioRoot.State = solidMergeProps(fieldState, {
    get disabled() {
      return disabled();
    },
    get required() {
      return required();
    },
    get readOnly() {
      return readOnly();
    },
    get checked() {
      return checked();
    },
  });

  const context: RadioRootContext = {
    dirty: () => fieldState.dirty,
    valid: () => fieldState.valid,
    filled: () => fieldState.filled,
    focused: () => fieldState.focused,
    disabled,
    touched,
    readOnly,
    checked,
    required,
  };

  const isRadioGroup = () => setCheckedValue !== NOOP;

  const ref = (el: any) => {
    registerControlRef(el);
    radioRef = el;
    buttonRef(el);
    if (typeof componentProps.ref === 'function') {
      componentProps.ref(el);
    } else {
      componentProps.ref = el;
    }
  };

  const props = () => [
    rootProps,
    getDescriptionProps,
    (p: any) => validation?.getValidationProps(p) ?? (p as any),
    elementProps,
    getButtonProps,
  ];

  const element = useRenderElement('span', componentProps, {
    enabled: isRadioGroup,
    state,
    ref,
    get props() {
      return props();
    },
    stateAttributesMapping,
  });

  return (
    <RadioRootContext.Provider value={context}>
      <Show when={isRadioGroup()} fallback={element()}>
        <CompositeItem
          tag="span"
          render={renderProps.render}
          class={renderProps.class}
          state={state}
          refs={ref}
          props={props()}
          stateAttributesMapping={stateAttributesMapping}
        />
      </Show>

      <input {...inputProps} />
    </RadioRootContext.Provider>
  );
}

export interface RadioRootState extends FieldRoot.State {
  /** Whether the radio button is currently selected. */
  checked: boolean;
  /** Whether the component should ignore user interaction. */
  disabled: boolean;
  /** Whether the user should be unable to select the radio button. */
  readOnly: boolean;
  /** Whether the user must choose a value before submitting a form. */
  required: boolean;
}

export interface RadioRootProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'span', RadioRoot.State>, 'value'> {
  /** The unique identifying value of the radio in a group. */
  value: any;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
  /** Whether the user must choose a value before submitting a form. */
  required?: boolean;
  /** Whether the user should be unable to select the radio button. */
  readOnly?: boolean;
  /** A ref to access the hidden input element. */
  inputRef?: Ref<HTMLInputElement>;
}

export namespace RadioRoot {
  export type State = RadioRootState;
  export type Props = RadioRootProps;
}
