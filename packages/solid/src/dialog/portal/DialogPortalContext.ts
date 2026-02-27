import { createContext, useContext, type Accessor } from 'solid-js';

export const DialogPortalContext = createContext<Accessor<boolean | undefined> | undefined>(
  undefined,
);

export function useDialogPortalContext() {
  const value = useContext(DialogPortalContext);
  if (value === undefined) {
    throw new Error('Base UI: <Dialog.Portal> is missing.');
  }
  return value;
}
