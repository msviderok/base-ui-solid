import { splitComponentProps } from '@msviderok/base-ui-solid/solid-helpers';
import { useButton } from '../use-button/useButton';
import type { BaseUIComponentProps, NativeButtonProps, NonNativeButtonProps } from '../utils/types';
import { useRenderElement } from '../utils/useRenderElement';

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export function Button(componentProps: Button.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'focusableWhenDisabled',
    'nativeButton',
  ]);
  const disabledProp = () => local.disabled ?? false;
  const focusableWhenDisabled = () => local.focusableWhenDisabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;

  const disabled = () => Boolean(disabledProp());

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled,
    native: nativeButton,
  });

  const state: Button.State = {
    get disabled() {
      return disabled();
    },
  };

  const element = useRenderElement('button', componentProps, {
    state,
    ref: buttonRef,
    props: [elementProps, getButtonProps],
  });

  return <>{element()}</>;
}

export interface ButtonState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

interface ButtonCommonProps {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled?: boolean;
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean;
}

type NonNativeAttributeKeys =
  | 'form'
  | 'formAction'
  | 'formEncType'
  | 'formMethod'
  | 'formNoValidate'
  | 'formTarget'
  | 'name'
  | 'type'
  | 'value';

interface ButtonNativeProps
  extends
    NativeButtonProps,
    ButtonCommonProps,
    Omit<BaseUIComponentProps<'button', ButtonState>, 'disabled'> {
  nativeButton?: true;
}

interface ButtonNonNativeProps
  extends
    NonNativeButtonProps,
    ButtonCommonProps,
    Omit<BaseUIComponentProps<'button', ButtonState>, NonNativeAttributeKeys | 'disabled'> {
  nativeButton: false;
}

export type ButtonProps = ButtonNativeProps | ButtonNonNativeProps;

export namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}
