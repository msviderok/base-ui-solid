import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePopoverRootContext } from '../root/PopoverRootContext';

/**
 * A button that closes the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverClose(props: PopoverClose.Props) {
  const [, local, elementProps] = splitComponentProps(props, ['disabled', 'nativeButton']);
  const disabled = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;

  const { buttonRef, getButtonProps } = useButton({
    disabled,
    focusableWhenDisabled: false,
    native: nativeButton,
  });

  const { store } = usePopoverRootContext();

  const element = useRenderElement('button', props, {
    ref: buttonRef,
    props: [
      {
        onClick(event) {
          store.setOpen(
            false,
            createChangeEventDetails(REASONS.closePress, event, event.currentTarget),
          );
        },
      },
      elementProps,
      getButtonProps,
    ],
  });

  return <>{element()}</>;
}

export interface PopoverCloseState {}

export interface PopoverCloseProps
  extends NativeButtonProps, BaseUIComponentProps<'button', PopoverClose.State> {}

export namespace PopoverClose {
  export type State = PopoverCloseState;
  export type Props = PopoverCloseProps;
}
