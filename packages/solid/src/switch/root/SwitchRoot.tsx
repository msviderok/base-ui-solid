import { EMPTY_OBJECT } from '@base-ui/utils/empty';
import {
  batch,
  createEffect,
  on,
  onMount,
  mergeProps as solidMergeProps,
  type JSX,
  type Ref,
} from 'solid-js';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useField } from '../../field/useField';
import { useFormContext } from '../../form/FormContext';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { mergeProps } from '../../merge-props';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIChangeEventDetails } from '../../types';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, NonNativeButtonProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useControlled } from '../../utils/useControlled';
import { useRenderElement } from '../../utils/useRenderElement';
import { visuallyHidden, visuallyHiddenInput } from '../../utils/visuallyHidden';
import { stateAttributesMapping } from '../stateAttributesMapping';
import { SwitchRootContext } from './SwitchRootContext';

/**
 * Represents the switch itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export function SwitchRoot(componentProps: SwitchRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'checked',
    'defaultChecked',
    'id',
    'inputRef',
    'name',
    'nativeButton',
    'onCheckedChange',
    'readOnly',
    'required',
    'disabled',
    'uncheckedValue',
    'value',
  ]);
  const checkedProp = () => local.checked;
  const idProp = () => local.id;
  const nameProp = () => local.name;
  const nativeButton = () => local.nativeButton ?? false;
  const readOnly = () => local.readOnly ?? false;
  const required = () => local.required ?? false;
  const disabledProp = () => local.disabled ?? false;

  const { clearErrors } = useFormContext();
  const {
    state: fieldState,
    setTouched,
    setDirty,
    validityData,
    setFilled,
    setFocused,
    shouldValidateOnChange,
    validationMode,
    disabled: fieldDisabled,
    name: fieldName,
    validation,
  } = useFieldRootContext();
  const { labelId } = useLabelableContext();

  const disabled = () => fieldDisabled() || disabledProp();
  const name = () => fieldName() ?? nameProp();

  const onCheckedChange: Exclude<typeof local.onCheckedChange, undefined> = (checked, event) => {
    local.onCheckedChange?.(checked, event);
  };

  let inputRef = null as HTMLInputElement | null | undefined;
  let switchRef = null as HTMLButtonElement | null | undefined;

  const id = useBaseUiId();

  const controlId = useLabelableId({
    id: idProp,
    implicit: false,
    controlRef: switchRef,
  });
  const hiddenInputId = () => (nativeButton() ? undefined : controlId());

  const [checked, setCheckedState] = useControlled({
    controlled: checkedProp,
    default: () => Boolean(local.defaultChecked),
    name: 'Switch',
    state: 'checked',
  });

  useField({
    id,
    commit: validation.commit,
    value: checked,
    controlRef: () => switchRef,
    name,
    getValue: checked,
  });

  onMount(() => {
    if (inputRef) {
      setFilled(inputRef.checked);
    }
  });

  createEffect(
    on(checked, (checkedValue) => {
      clearErrors(name());
      setDirty(checkedValue !== validityData.initialValue);
      setFilled(checkedValue);

      if (shouldValidateOnChange()) {
        validation.commit(checkedValue);
      } else {
        validation.commit(checkedValue, true);
      }
    }),
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const rootProps: JSX.HTMLAttributes<HTMLSpanElement> = {
    get id() {
      return nativeButton() ? controlId() : id();
    },
    role: 'switch',
    get 'aria-checked'() {
      return checked();
    },
    get 'aria-readonly'() {
      return readOnly() || undefined;
    },
    get 'aria-required'() {
      return required() || undefined;
    },
    get 'aria-labelledby'() {
      return labelId();
    },
    onFocus() {
      if (!disabled()) {
        setFocused(true);
      }
    },
    onBlur() {
      if (!inputRef || disabled()) {
        return;
      }

      batch(() => {
        setTouched(true);
        setFocused(false);

        if (validationMode() === 'onBlur') {
          validation.commit(inputRef!.checked);
        }
      });
    },
    onClick(event) {
      if (readOnly() || disabled()) {
        return;
      }

      event.preventDefault();

      inputRef?.dispatchEvent(
        new PointerEvent('click', {
          bubbles: true,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
        }),
      );
    },
  };

  const inputProps = mergeProps<'input'>(
    {
      get checked() {
        return checked();
      },
      get disabled() {
        return disabled();
      },
      get id() {
        return hiddenInputId();
      },
      get name() {
        return name();
      },
      get required() {
        return required();
      },
      get style() {
        return name() ? visuallyHiddenInput : visuallyHidden;
      },
      tabIndex: -1,
      type: 'checkbox',
      'aria-hidden': true,
      ref: (el) => {
        inputRef = el;
        validation.inputRef = el;
        if (typeof local.inputRef === 'function') {
          local.inputRef(el);
        } else {
          local.inputRef = el;
        }
      },
      onInput(event) {
        // Workaround for https://github.com/facebook/react/issues/9023
        if (event.defaultPrevented) {
          return;
        }

        batch(() => {
          const nextChecked = event.target.checked;

          const eventDetails = createChangeEventDetails(REASONS.none, event);

          onCheckedChange?.(nextChecked, eventDetails);

          if (eventDetails.isCanceled) {
            return;
          }

          setCheckedState(nextChecked);
        });
      },
      onFocus() {
        switchRef?.focus();
      },
    },
    validation.getInputValidationProps,
    {
      get value() {
        return local.value !== undefined ? local.value : undefined;
      },
    },
  );

  const state: SwitchRoot.State = solidMergeProps(fieldState, {
    get disabled() {
      return disabled();
    },
    get checked() {
      return checked();
    },
    get readOnly() {
      return readOnly();
    },
    get required() {
      return required();
    },
  });

  const context: SwitchRootContext = {
    touched: () => fieldState.touched,
    dirty: () => fieldState.dirty,
    valid: () => fieldState.valid,
    filled: () => fieldState.filled,
    focused: () => fieldState.focused,
    checked,
    disabled,
    readOnly,
    required,
  };

  const element = useRenderElement('span', componentProps, {
    state,
    ref: (el) => {
      switchRef = el as any;
      buttonRef(el);
    },
    props: [rootProps, validation.getValidationProps, elementProps, getButtonProps],
    stateAttributesMapping,
  });

  return (
    <SwitchRootContext.Provider value={context}>
      {element()}
      {!checked() && name() && local.uncheckedValue !== undefined && (
        <input type="hidden" name={name()} value={local.uncheckedValue} />
      )}
      <input {...(inputProps as any)} />
    </SwitchRootContext.Provider>
  );
}

export interface SwitchRootState extends FieldRoot.State {
  /**
   * Whether the switch is currently active.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   */
  readOnly: boolean;
  /**
   * Whether the user must activate the switch before submitting a form.
   */
  required: boolean;
}

export interface SwitchRootProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'span', SwitchRoot.State>, 'onChange'> {
  /**
   * The id of the switch element.
   */
  id?: string | undefined;
  /**
   * Whether the switch is currently active.
   *
   * To render an uncontrolled switch, use the `defaultChecked` prop instead.
   */
  checked?: boolean | undefined;
  /**
   * Whether the switch is initially active.
   *
   * To render a controlled switch, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: Ref<HTMLInputElement> | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Event handler called when the switch is activated or deactivated.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: SwitchRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the user should be unable to activate or deactivate the switch.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must activate the switch before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * The value submitted with the form when the switch is on.
   * By default, switch submits the "on" value, matching native checkbox behavior.
   */
  value?: string | undefined;
  /**
   * The value submitted with the form when the switch is off.
   * By default, unchecked switches do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string | undefined;
}

export type SwitchRootChangeEventReason = typeof REASONS.none;
export type SwitchRootChangeEventDetails = BaseUIChangeEventDetails<SwitchRoot.ChangeEventReason>;

export namespace SwitchRoot {
  export type State = SwitchRootState;
  export type Props = SwitchRootProps;
  export type ChangeEventReason = SwitchRootChangeEventReason;
  export type ChangeEventDetails = SwitchRootChangeEventDetails;
}
