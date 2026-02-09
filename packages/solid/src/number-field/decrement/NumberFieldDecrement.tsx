import { mergeProps as solidMergeProps } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { NumberFieldRoot } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { useNumberFieldButton } from '../root/useNumberFieldButton';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';

/**
 * A stepper button that decreases the field value when clicked.
 * Renders an `<button>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldDecrement(componentProps: NumberFieldDecrement.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled', 'nativeButton']);
  const disabledProp = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;

  const {
    disabled: contextDisabled,
    getStepAmount,
    id,
    incrementValue,
    inputValue,
    intentionalTouchCheckTimeout,
    minWithDefault,
    readOnly,
    setValue,
    startAutoChange,
    state,
    stopAutoChange,
    value,
    locale,
    refs,
    onValueCommitted,
  } = useNumberFieldRootContext();

  const isMin = () => value() != null && value()! < minWithDefault();
  const disabled = () => disabledProp() || contextDisabled() || isMin();

  const { props } = useNumberFieldButton({
    isIncrement: false,
    startAutoChange,
    stopAutoChange,
    inputValue,
    disabled,
    readOnly,
    id,
    setValue,
    getStepAmount,
    incrementValue,
    intentionalTouchCheckTimeout,
    locale,
    refs,
    onValueCommitted,
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
    focusableWhenDisabled: true,
  });

  const buttonState = solidMergeProps(state, {
    get disabled() {
      return disabled();
    },
  });

  const element = useRenderElement('button', componentProps, {
    state: buttonState,
    ref: buttonRef,
    props: [props, elementProps, getButtonProps],
    stateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface NumberFieldDecrementState extends NumberFieldRoot.State {}

export interface NumberFieldDecrementProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NumberFieldDecrement.State> {}

export namespace NumberFieldDecrement {
  export type State = NumberFieldDecrementState;
  export type Props = NumberFieldDecrementProps;
}
