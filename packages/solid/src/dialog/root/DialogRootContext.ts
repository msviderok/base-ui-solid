import { createContext, useContext } from 'solid-js';
import { DialogStore } from '../store/DialogStore';

export interface DialogRootContext<Payload = unknown> {
  store: DialogStore<Payload>;
}

export const DialogRootContext = createContext<DialogRootContext | undefined>(undefined);

export function useDialogRootContext(optional?: false): DialogRootContext;
export function useDialogRootContext(optional: true): DialogRootContext | undefined;
export function useDialogRootContext(optional?: boolean) {
  const dialogRootContext = useContext(DialogRootContext);

  if (optional === false && dialogRootContext === undefined) {
    throw new Error(
      'Base UI: DialogRootContext is missing. Dialog parts must be placed within <Dialog.Root>.',
    );
  }

  return dialogRootContext;
}
