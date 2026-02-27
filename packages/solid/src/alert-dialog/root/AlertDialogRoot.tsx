import { untrack, type Accessor } from 'solid-js';
import type { DialogRoot } from '../../dialog/root/DialogRoot';
import { DialogRootContext, useDialogRootContext } from '../../dialog/root/DialogRootContext';
import { useDialogRoot } from '../../dialog/root/useDialogRoot';
import { DialogHandle } from '../../dialog/store/DialogHandle';
import { DialogStore } from '../../dialog/store/DialogStore';
import { ComponentWithPayload, type ReactLikeRef } from '../../solid-helpers';
import { BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';

/**
 * Groups all parts of the alert dialog.
 * Doesn’t render its own HTML element.
 *
 * Documentation: [Base UI Alert Dialog](https://base-ui.com/react/components/alert-dialog)
 */
export function AlertDialogRoot<Payload>(props: AlertDialogRoot.Props<Payload>) {
  const openProp = () => props.open;
  const defaultOpen = () => props.defaultOpen ?? false;
  const triggerIdProp = () => props.triggerId;
  const defaultTriggerIdProp = () => props.defaultTriggerId ?? null;

  const parentDialogRootContext = useDialogRootContext();
  const nested = () => Boolean(parentDialogRootContext);

  const store = untrack(
    () =>
      props.handle?.store ??
      DialogStore<Payload>({
        get open() {
          return defaultOpen();
        },
        get openProp() {
          return openProp();
        },
        get activeTriggerId() {
          return defaultTriggerIdProp();
        },
        get triggerIdProp() {
          return triggerIdProp();
        },
        modal: true,
        disablePointerDismissal: true,
        get nested() {
          return nested();
        },
        role: 'alertdialog',
      }),
  );

  store.useControlledProp('openProp', openProp);
  store.useControlledProp('triggerIdProp', triggerIdProp);
  store.useSyncedValue('nested', nested);
  store.useContextCallback('onOpenChange', props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', props.onOpenChangeComplete);

  const payload = store.useState('payload') as Accessor<Payload | undefined>;

  useDialogRoot({
    store,
    get actionsRef() {
      return props.actionsRef;
    },
    get parentContext() {
      return parentDialogRootContext?.store.context;
    },
    get onOpenChange() {
      return props.onOpenChange;
    },
    get triggerIdProp() {
      return triggerIdProp();
    },
  });

  const contextValue: DialogRootContext<Payload> = { store };

  return (
    <DialogRootContext.Provider value={contextValue as DialogRootContext}>
      <ComponentWithPayload payload={payload} children={props.children} />
    </DialogRootContext.Provider>
  );
}

export interface AlertDialogRootProps<Payload = unknown> extends Omit<
  DialogRoot.Props<Payload>,
  'modal' | 'disablePointerDismissal' | 'onOpenChange' | 'actionsRef' | 'handle'
> {
  /**
   * Event handler called when the dialog is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: AlertDialogRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: When specified, the dialog will not be unmounted when closed.
   * Instead, the `unmount` function must be called to unmount the dialog manually.
   * Useful when the dialog's animation is controlled by an external library.
   * - `close`: Closes the dialog imperatively when called.
   */
  actionsRef?: ReactLikeRef<AlertDialogRoot.Actions | null> | undefined;
  /**
   * A handle to associate the alert dialog with a trigger.
   * If specified, allows external triggers to control the alert dialog's open state.
   * Can be created with the AlertDialog.createHandle() method.
   */
  handle?: DialogHandle<Payload> | undefined;
}

export type AlertDialogRootActions = DialogRoot.Actions;

export type AlertDialogRootChangeEventReason = DialogRoot.ChangeEventReason;
export type AlertDialogRootChangeEventDetails =
  BaseUIChangeEventDetails<AlertDialogRoot.ChangeEventReason> & {
    preventUnmountOnClose(): void;
  };

export namespace AlertDialogRoot {
  export type Props<Payload = unknown> = AlertDialogRootProps<Payload>;
  export type Actions = AlertDialogRootActions;
  export type ChangeEventReason = AlertDialogRootChangeEventReason;
  export type ChangeEventDetails = AlertDialogRootChangeEventDetails;
}
