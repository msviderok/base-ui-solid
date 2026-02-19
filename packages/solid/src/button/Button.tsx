import { splitComponentProps } from '@msviderok/base-ui-solid/solid-helpers';
import { useButton } from '../use-button/useButton';
import type { BaseUIComponentProps, NativeButtonProps } from '../utils/types';
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
  const disabled = () => local.disabled ?? false;
  const focusableWhenDisabled = () => local.focusableWhenDisabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;

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

export interface ButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ButtonState> {
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
}

export namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}
