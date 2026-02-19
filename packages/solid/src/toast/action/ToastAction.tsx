import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button/useButton';
import type { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useToastRootContext } from '../root/ToastRootContext';

/**
 * Performs an action when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastAction(componentProps: ToastAction.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled', 'nativeButton']);
  const nativeButton = () => local.nativeButton ?? true;

  const { toast } = useToastRootContext();

  const { getButtonProps, buttonRef } = useButton({
    disabled: () => local.disabled,
    native: nativeButton,
  });

  const state: ToastAction.State = {
    get type() {
      return toast().type;
    },
  };

  const element = useRenderElement('button', componentProps, {
    enabled: () => Boolean(toast().actionProps?.children ?? componentProps.children),
    state,
    ref: buttonRef,
    get props() {
      return [elementProps, toast().actionProps, getButtonProps];
    },
    get children() {
      return <>{toast().actionProps?.children ?? componentProps.children}</>;
    },
  });

  return <>{element()}</>;
}

export interface ToastActionState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastActionProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToastAction.State> {}

export namespace ToastAction {
  export type State = ToastActionState;
  export type Props = ToastActionProps;
}
