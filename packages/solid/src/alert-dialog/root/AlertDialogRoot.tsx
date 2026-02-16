import type { Accessor } from 'solid-js';
import type { DialogRoot } from '../../dialog/root/DialogRoot';
import { DialogRootContext, useDialogRootContext } from '../../dialog/root/DialogRootContext';
import { useDialogRoot } from '../../dialog/root/useDialogRoot';
import { DialogHandle } from '../../dialog/store/DialogHandle';
import { DialogStore } from '../../dialog/store/DialogStore';
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

  const store =
    props.handle?.store ??
    new DialogStore<Payload>({
      get open() {
        return defaultOpen();
      },
      get activeTriggerId() {
        return triggerIdProp() !== undefined ? triggerIdProp() : defaultTriggerIdProp();
      },
      modal: true,
      disablePointerDismissal: true,
      get nested() {
        return nested();
      },
      role: 'alertdialog',
    });

  store.useControlledProp('open', openProp, defaultOpen);
  store.useControlledProp('activeTriggerId', triggerIdProp, defaultTriggerIdProp);
  store.useSyncedValue('nested', nested);
  store.useContextCallback('onOpenChange', props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', props.onOpenChangeComplete);

  const payload = store.useState('payload') as Accessor<Payload | undefined>;

  useDialogRoot({
    store,
    actionsRef: props.actionsRef,
    parentContext: parentDialogRootContext?.store.context,
    onOpenChange: props.onOpenChange,
    get triggerIdProp() {
      return triggerIdProp();
    },
  });

  const contextValue: DialogRootContext<Payload> = { store };

  return (
    <DialogRootContext.Provider value={contextValue as DialogRootContext}>
      {typeof props.children === 'function'
        ? props.children({ payload: payload() })
        : props.children}
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
  onOpenChange?: (open: boolean, eventDetails: AlertDialogRoot.ChangeEventDetails) => void;
  /**
   * A ref to imperative actions.
   * - `unmount`: When specified, the dialog will not be unmounted when closed.
   * Instead, the `unmount` function must be called to unmount the dialog manually.
   * Useful when the dialog's animation is controlled by an external library.
   * - `close`: Closes the dialog imperatively when called.
   */
  actionsRef?: AlertDialogRoot.Actions;
  /**
   * A handle to associate the popover with a trigger.
   * If specified, allows external triggers to control the popover's open state.
   * Can be created with the AlertDialog.createHandle() method.
   */
  handle?: DialogHandle<Payload>;
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
