import { ownerDocument } from '@base-ui/utils/owner';
import { createEffect, mergeProps as solidMergeProps, type JSX } from 'solid-js';
import { activeElement } from '../../floating-ui-solid/utils';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps } from '../../utils/types';
import { useControlled } from '../../utils/useControlled';
import { useRenderElement } from '../../utils/useRenderElement';
import { FieldRoot } from '../root/FieldRoot';
import { useFieldRootContext } from '../root/FieldRootContext';
import { useField } from '../useField';
import { fieldValidityMapping } from '../utils/constants';

/**
 * The form control to label and validate.
 * Renders an `<input>` element.
 *
 * You can omit this part and use any Base UI input component instead. For example,
 * [Input](https://base-ui.com/react/components/input), [Checkbox](https://base-ui.com/react/components/checkbox),
 * or [Select](https://base-ui.com/react/components/select), among others, will work with Field out of the box.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldControl(componentProps: FieldControl.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'id',
    'name',
    'value',
    'disabled',
    'onValueChange',
    'defaultValue',
    'autofocus',
  ]);
  const idProp = () => local.id;
  const nameProp = () => local.name;
  const valueProp = () => local.value;
  const disabledProp = () => local.disabled ?? false;
  const autofocus = () => local.autofocus ?? false;

  const {
    state: fieldState,
    name: fieldName,
    disabled: fieldDisabled,
    setTouched,
    setDirty,
    validityData,
    setFocused,
    setFilled,
    validationMode,
    validation,
  } = useFieldRootContext();

  const disabled = () => fieldDisabled() || disabledProp();
  const name = () => fieldName() ?? nameProp();

  const state: FieldControl.State = solidMergeProps(fieldState, {
    get disabled() {
      return disabled();
    },
  });

  const { labelId } = useLabelableContext();

  const id = useLabelableId({ id: idProp });

  createEffect(() => {
    const hasExternalValue = valueProp() != null;
    if (validation.inputRef.current?.value || (hasExternalValue && valueProp() !== '')) {
      setFilled(true);
    } else if (hasExternalValue && local.value === '') {
      setFilled(false);
    }
  });

  let inputRef = null as HTMLElement | null | undefined;

  createEffect(() => {
    if (autofocus() && inputRef === activeElement(ownerDocument(inputRef ?? null))) {
      setFocused(true);
    }
  });

  const [valueUnwrapped] = useControlled({
    controlled: valueProp,
    default: () => local.defaultValue,
    name: 'FieldControl',
    state: 'value',
  });

  const isControlled = () => valueProp() !== undefined;

  const value = () => (isControlled() ? valueUnwrapped() : undefined);

  useField({
    id,
    name,
    commit: validation.commit,
    value,
    getValue: () => validation.inputRef.current?.value,
    controlRef: () => validation.inputRef.current,
  });

  const element = useRenderElement('input', componentProps, {
    state,
    ref: (el) => {
      validation.inputRef.current = el;
      inputRef = el;
    },
    get props() {
      return [
        {
          get id() {
            return id();
          },
          get disabled() {
            return disabled();
          },
          get name() {
            return name();
          },
          get 'aria-labelledby'() {
            return labelId();
          },
          get autofocus() {
            return autofocus();
          },
          get value() {
            return isControlled() ? value() : local.defaultValue;
          },
          onInput(event: InputEvent) {
            const inputValue = (event.currentTarget as HTMLInputElement).value;
            local.onValueChange?.(inputValue, createChangeEventDetails(REASONS.none, event));
            setDirty(inputValue !== validityData.initialValue);
            setFilled(inputValue !== '');
          },
          onFocus() {
            setFocused(true);
          },
          onBlur(event: FocusEvent) {
            setTouched(true);
            setFocused(false);

            if (validationMode() === 'onBlur') {
              validation.commit((event.currentTarget as HTMLInputElement).value);
            }
          },
          onKeyDown(event: KeyboardEvent) {
            if (
              (event.currentTarget as HTMLInputElement).tagName === 'INPUT' &&
              event.key === 'Enter'
            ) {
              setTouched(true);
              validation.commit((event.currentTarget as HTMLInputElement).value);
            }
          },
        },
        validation.getInputValidationProps(),
        elementProps,
      ];
    },
    stateAttributesMapping: fieldValidityMapping,
  });

  return <>{element()}</>;
}

export type FieldControlState = FieldRoot.State;

export interface FieldControlProps extends BaseUIComponentProps<'input', FieldControl.State> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?:
    | ((value: string, eventDetails: FieldControl.ChangeEventDetails) => void)
    | undefined;
  defaultValue?: JSX.InputHTMLAttributes<HTMLInputElement>['value'] | undefined;
}

export type FieldControlChangeEventReason = typeof REASONS.none;

export type FieldControlChangeEventDetails =
  BaseUIChangeEventDetails<FieldControl.ChangeEventReason>;

export namespace FieldControl {
  export type State = FieldControlState;
  export type Props = FieldControlProps;
  export type ChangeEventReason = FieldControlChangeEventReason;
  export type ChangeEventDetails = FieldControlChangeEventDetails;
}
