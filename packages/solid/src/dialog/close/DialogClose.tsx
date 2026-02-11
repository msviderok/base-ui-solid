import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useDialogRootContext } from '../root/DialogRootContext';

/**
 * A button that closes the dialog.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogClose(componentProps: DialogClose.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled', 'nativeButton']);
  const disabled = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;

  const { store } = useDialogRootContext();
  const open = store.useState('open');

  function handleClick(event: MouseEvent) {
    if (open()) {
      store.setOpen(false, createChangeEventDetails(REASONS.closePress, event));
    }
  }

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const state: DialogClose.State = {
    get disabled() {
      return disabled();
    },
  };

  const element = useRenderElement('button', componentProps, {
    state,
    ref: buttonRef,
    props: [{ onClick: handleClick }, elementProps, getButtonProps],
  });

  return <>{element()}</>;
}

export interface DialogCloseProps
  extends NativeButtonProps, BaseUIComponentProps<'button', DialogClose.State> {}

export interface DialogCloseState {
  /**
   * Whether the button is currently disabled.
   */
  disabled: boolean;
}

export namespace DialogClose {
  export type Props = DialogCloseProps;
  export type State = DialogCloseState;
}
