import { mergeProps as solidMergeProps } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import type { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { NumberFieldRoot } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { useNumberFieldButton } from '../root/useNumberFieldButton';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';

/**
 * A stepper button that increases the field value when clicked.
 * Renders an `<button>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldIncrement(componentProps: NumberFieldIncrement.Props) {
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
    locale,
    maxWithDefault,
    readOnly,
    setValue,
    startAutoChange,
    state,
    stopAutoChange,
    value,
    refs,
    onValueCommitted,
  } = useNumberFieldRootContext();

  const isMax = () => value() != null && value()! >= maxWithDefault();
  const disabled = () => disabledProp() || contextDisabled() || isMax();

  const { props } = useNumberFieldButton({
    isIncrement: true,
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

export interface NumberFieldIncrementState extends NumberFieldRoot.State {}

export interface NumberFieldIncrementProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NumberFieldIncrement.State> {}

export namespace NumberFieldIncrement {
  export type State = NumberFieldIncrementState;
  export type Props = NumberFieldIncrementProps;
}
