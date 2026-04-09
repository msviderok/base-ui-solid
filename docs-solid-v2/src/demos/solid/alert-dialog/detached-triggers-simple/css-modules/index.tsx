import { AlertDialog } from '@msviderok/base-ui-solid/alert-dialog';
import styles from '../../_index.module.css';

const demoAlertDialog = AlertDialog.createHandle();

export default function AlertDialogDetachedTriggersSimpleDemo() {
  return (
    <>
      <AlertDialog.Trigger
        class={`${styles.Button} ${styles.DangerButton}`}
        handle={demoAlertDialog}
      >
        Discard draft
      </AlertDialog.Trigger>
      <AlertDialog.Root handle={demoAlertDialog}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop class={styles.Backdrop} />
          <AlertDialog.Popup class={styles.Popup}>
            <AlertDialog.Title class={styles.Title}>Discard draft?</AlertDialog.Title>
            <AlertDialog.Description class={styles.Description}>
              This action cannot be undone.
            </AlertDialog.Description>
            <div class={styles.Actions}>
              <AlertDialog.Close class={styles.Button}>Cancel</AlertDialog.Close>
              <AlertDialog.Close class={`${styles.Button} ${styles.DangerButton}`}>
                Discard
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
