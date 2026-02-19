import { createSignal } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button/useButton';
import type { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { useToastRootContext } from '../root/ToastRootContext';

/**
 * Closes the toast when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastClose(componentProps: ToastClose.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled', 'nativeButton']);
  const nativeButton = () => local.nativeButton ?? true;

  const store = useToastProviderContext();
  const { toast } = useToastRootContext();
  const expanded = store.useState('expanded');

  const [hasFocus, setHasFocus] = createSignal(false);

  const { getButtonProps, buttonRef } = useButton({
    disabled: () => local.disabled,
    native: nativeButton,
  });

  const state: ToastClose.State = {
    get type() {
      return toast().type;
    },
  };

  const element = useRenderElement('button', componentProps, {
    state,
    ref: buttonRef,
    props: [
      {
        get 'aria-hidden'() {
          return !expanded() && !hasFocus();
        },
        onClick() {
          store.closeToast(toast().id);
        },
        onFocus() {
          setHasFocus(true);
        },
        onBlur() {
          setHasFocus(false);
        },
      },
      elementProps,
      getButtonProps,
    ],
  });

  return <>{element()}</>;
}

export interface ToastCloseState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastCloseProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToastClose.State> {}

export namespace ToastClose {
  export type State = ToastCloseState;
  export type Props = ToastCloseProps;
}
