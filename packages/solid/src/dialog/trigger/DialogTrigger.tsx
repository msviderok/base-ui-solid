import { createEffect, createMemo } from 'solid-js';
import { useClick, useInteractions } from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button/useButton';
import { CLICK_TRIGGER_IDENTIFIER } from '../../utils/constants';
import { useTriggerDataForwarding } from '../../utils/popups';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useDialogRootContext } from '../root/DialogRootContext';
import { DialogHandle } from '../store/DialogHandle';
import type { DialogStore } from '../store/DialogStore';

/**
 * A button that opens the dialog.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogTrigger<Payload>(componentProps: DialogTrigger.Props<Payload>) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'render',
    'class',
    'disabled',
    'nativeButton',
    'id',
    'payload',
    'handle',
  ]);
  const disabled = () => local.disabled ?? false;
  const native = () => local.nativeButton ?? true;
  const idProp = () => local.id;

  const dialogRootContext = useDialogRootContext(true);
  const store = () => (local.handle?.store ?? dialogRootContext?.store) as DialogStore<unknown>;

  createEffect(() => {
    if (!store()) {
      throw new Error(
        'Base UI: <Dialog.Trigger> must be used within <Dialog.Root> or provided with a handle.',
      );
    }
  });

  const thisTriggerId = useBaseUiId(idProp);
  const floatingContext = () => store()?.context.floatingRootContext;
  const isOpenedByThisTrigger = createMemo(() =>
    store()?.select('isOpenedByTrigger', thisTriggerId),
  );

  let triggerElementRef = null as Element | null | undefined;

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding({
    get triggerId() {
      return thisTriggerId();
    },
    get triggerElement() {
      return triggerElementRef;
    },
    get store() {
      return store();
    },
    stateUpdates: {
      get payload() {
        return local.payload;
      },
    },
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native,
  });

  const click = useClick({
    get context() {
      return floatingContext();
    },
    props: {
      get enabled() {
        return floatingContext() != null;
      },
    },
  });

  const localInteractionProps = useInteractions([click]);

  const state: DialogTrigger.State = {
    get disabled() {
      return disabled();
    },
    get open() {
      return isOpenedByThisTrigger();
    },
  };

  const rootTriggerProps = () => store()?.select('triggerProps', isMountedByThisTrigger);

  const element = useRenderElement('button', componentProps, {
    state,
    ref: (el) => {
      buttonRef(el);
      registerTrigger(el);
      triggerElementRef = el;
    },
    get props() {
      return [
        localInteractionProps.getReferenceProps(),
        rootTriggerProps(),
        {
          [CLICK_TRIGGER_IDENTIFIER as string]: '',
          get id() {
            return thisTriggerId();
          },
        },
        elementProps,
        getButtonProps,
      ];
    },
    stateAttributesMapping: triggerOpenStateMapping,
  });

  return <>{element()}</>;
}

export interface DialogTriggerProps<Payload = unknown>
  extends NativeButtonProps, BaseUIComponentProps<'button', DialogTrigger.State> {
  /**
   * A handle to associate the trigger with a dialog.
   * Can be created with the Dialog.createHandle() method.
   */
  handle?: DialogHandle<Payload> | undefined;
  /**
   * A payload to pass to the dialog when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * ID of the trigger. In addition to being forwarded to the rendered element,
   * it is also used to specify the active trigger for the dialogs in controlled mode (with the DialogRoot `triggerId` prop).
   */
  id?: string | undefined;
}

export interface DialogTriggerState {
  /**
   * Whether the dialog is currently disabled.
   */
  disabled: boolean;
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
}

export namespace DialogTrigger {
  export type Props<Payload = unknown> = DialogTriggerProps<Payload>;
  export type State = DialogTriggerState;
}
