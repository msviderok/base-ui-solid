import { createSignal } from 'solid-js';
import { AlertDialog } from '@msviderok/base-ui-solid/alert-dialog';
import styles from '../../_index.module.css';

type AlertPayload = { message: string };

const demoAlertDialog = AlertDialog.createHandle<AlertPayload>();

export default function AlertDialogDetachedTriggersControlledDemo() {
  const [open, setOpen] = createSignal(false);
  const [triggerId, setTriggerId] = createSignal<string | null>(null);

  const handleOpenChange = (isOpen: boolean, eventDetails: AlertDialog.Root.ChangeEventDetails) => {
    setOpen(isOpen);
    setTriggerId(eventDetails.trigger?.id ?? null);
  };

  return (
    <>
      <div class={styles.Container}>
        <AlertDialog.Trigger
          class={`${styles.Button} ${styles.DangerButton}`}
          handle={demoAlertDialog}
          id="alert-trigger-1"
          payload={{ message: 'Discard draft?' }}
        >
          Discard
        </AlertDialog.Trigger>

        <AlertDialog.Trigger
          class={`${styles.Button} ${styles.DangerButton}`}
          handle={demoAlertDialog}
          id="alert-trigger-2"
          payload={{ message: 'Delete project?' }}
        >
          Delete
        </AlertDialog.Trigger>

        <AlertDialog.Trigger
          class={styles.Button}
          handle={demoAlertDialog}
          id="alert-trigger-3"
          payload={{ message: 'Sign out?' }}
        >
          Sign out
        </AlertDialog.Trigger>

        <button
          class={styles.Button}
          type="button"
          onClick={() => {
            setTriggerId('alert-trigger-2');
            setOpen(true);
          }}
        >
          Open programmatically
        </button>
      </div>
      <AlertDialog.Root<AlertPayload>
        handle={demoAlertDialog}
        open={open()}
        onOpenChange={handleOpenChange}
        triggerId={triggerId()}
      >
        {({ payload }) => (
          <AlertDialog.Portal>
            <AlertDialog.Backdrop class={styles.Backdrop} />
            <AlertDialog.Popup class={styles.Popup}>
              <AlertDialog.Title class={styles.Title}>
                {payload?.message ?? 'Are you sure?'}
              </AlertDialog.Title>
              <AlertDialog.Description class={styles.Description}>
                This action cannot be undone.
              </AlertDialog.Description>
              <div class={styles.Actions}>
                <AlertDialog.Close class={styles.Button}>Cancel</AlertDialog.Close>
                <AlertDialog.Close class={`${styles.Button} ${styles.DangerButton}`}>
                  Confirm
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        )}
      </AlertDialog.Root>
    </>
  );
}
