import { Dialog } from '@msviderok/base-ui-solid/dialog';
import styles from '../../_index.module.css';

const demoDialog = Dialog.createHandle();

export default function DialogDetachedTriggersSimpleDemo() {
  return (
    <>
      <Dialog.Trigger class={styles.Button} handle={demoDialog}>
        View notifications
      </Dialog.Trigger>
      <Dialog.Root handle={demoDialog}>
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
    </>
  );
}
