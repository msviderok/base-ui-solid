import { AlertDialog } from '@msviderok/base-ui-solid/alert-dialog';
import styles from './index.module.css';

export default function ExampleAlertDialog() {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger data-color="red" class={styles.Button}>
        Discard draft
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop class={styles.Backdrop} />
        <AlertDialog.Popup class={styles.Popup}>
          <AlertDialog.Title class={styles.Title}>Discard draft?</AlertDialog.Title>
          <AlertDialog.Description class={styles.Description}>
            You can't undo this action.
          </AlertDialog.Description>
          <div class={styles.Actions}>
            <AlertDialog.Close class={styles.Button}>Cancel</AlertDialog.Close>
            <AlertDialog.Close data-color="red" class={styles.Button}>
              Discard
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
