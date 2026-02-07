import { batch, createEffect, mergeProps as solidMergeProps, type JSX } from 'solid-js';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { mergeProps } from '../../merge-props';
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
  ]);
  const idProp = () => local.id;
  const nameProp = () => local.name;
  const valueProp = () => local.value;
  const disabledProp = () => local.disabled ?? false;

  const { state: fieldState, name: fieldName, disabled: fieldDisabled } = useFieldRootContext();

  const disabled = () => fieldDisabled() || disabledProp();
  const name = () => fieldName() ?? nameProp();

  const state: FieldControl.State = solidMergeProps(fieldState, {
    get disabled() {
      return disabled();
    },
  });

  const { setTouched, setDirty, validityData, setFocused, setFilled, validationMode, validation } =
    useFieldRootContext();
  const { labelId } = useLabelableContext();

  const id = useLabelableId({ id: idProp });

  createEffect(() => {
    const hasExternalValue = valueProp() != null;
    if (validation.inputRef?.value || (hasExternalValue && valueProp() !== '')) {
      setFilled(true);
    } else if (hasExternalValue && local.value === '') {
      setFilled(false);
    }
  });

  const [value, setValueUnwrapped] = useControlled({
    controlled: () => local.value,
    default: () => local.defaultValue,
    name: 'FieldControl',
    state: 'value',
  });

  const setValue = (nextValue: string, eventDetails: FieldControl.ChangeEventDetails) => {
    batch(() => {
      local.onValueChange?.(nextValue, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      setValueUnwrapped(nextValue);
    });
  };

  useField({
    id,
    name,
    commit: validation.commit,
    value,
    getValue: () => validation.inputRef?.value,
    controlRef: () => validation.inputRef,
  });

  const element = useRenderElement('input', componentProps, {
    state,
    ref: (el) => {
      validation.inputRef = el;
    },
    customStyleHookMapping: fieldValidityMapping,
    props: [
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
        get value() {
          return value();
        },
        onChange(event) {
          const inputValue = event.currentTarget.value;
          setValue(inputValue, createChangeEventDetails(REASONS.none, event));
          setDirty(inputValue !== validityData.initialValue);
          setFilled(inputValue !== '');
        },
        onFocus() {
          setFocused(true);
        },
        onBlur(event) {
          setTouched(true);
          setFocused(false);

          if (validationMode() === 'onBlur') {
            validation.commit(event.currentTarget.value);
          }
        },
        onKeyDown(event) {
          if (event.currentTarget.tagName === 'INPUT' && event.key === 'Enter') {
            setTouched(true);
            validation.commit(event.currentTarget.value);
          }
        },
      },
      (props) => mergeProps(props, validation.getInputValidationProps()),
      elementProps,
    ],
    stateAttributesMapping: fieldValidityMapping,
  });

  return <>{element()}</>;
}

export type FieldControlState = FieldRoot.State;

export interface FieldControlProps extends BaseUIComponentProps<'input', FieldControl.State> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?: (value: string, eventDetails: FieldControl.ChangeEventDetails) => void;
  defaultValue?: JSX.InputHTMLAttributes<HTMLInputElement>['value'];
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
