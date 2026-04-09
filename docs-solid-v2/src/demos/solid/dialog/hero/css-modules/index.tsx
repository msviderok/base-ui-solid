import { Dialog } from '@msviderok/base-ui-solid/dialog';
import styles from './index.module.css';

export default function ExampleDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger class={styles.Button}>View notifications</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop class={styles.Backdrop} />
        <Dialog.Popup class={styles.Popup}>
          <Dialog.Title class={styles.Title}>Notifications</Dialog.Title>
          <Dialog.Description class={styles.Description}>
            You are all caught up. Good job!
          </Dialog.Description>
          <div class={styles.Actions}>
            <Dialog.Close class={styles.Button}>Close</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
