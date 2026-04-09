import { createSignal } from 'solid-js';
import { Dialog } from '@msviderok/base-ui-solid/dialog';
import styles from '../../_index.module.css';

const demoDialog = Dialog.createHandle<number>();

export default function DialogDetachedTriggersControlledDemo() {
  const [open, setOpen] = createSignal(false);
  const [triggerId, setTriggerId] = createSignal<string | null>(null);

  const handleOpenChange = (isOpen: boolean, eventDetails: Dialog.Root.ChangeEventDetails) => {
    setOpen(isOpen);
    setTriggerId(eventDetails.trigger?.id ?? null);
  };

  return (
    <>
      <div class={styles.Container}>
        <Dialog.Trigger class={styles.Button} handle={demoDialog} id="trigger-1" payload={1}>
          Open 1
        </Dialog.Trigger>

        <Dialog.Trigger class={styles.Button} handle={demoDialog} id="trigger-2" payload={2}>
          Open 2
        </Dialog.Trigger>

        <Dialog.Trigger class={styles.Button} handle={demoDialog} id="trigger-3" payload={3}>
          Open 3
        </Dialog.Trigger>

        <button
          class={styles.Button}
          type="button"
          onClick={() => {
            setTriggerId('trigger-2');
            setOpen(true);
          }}
        >
          Open programmatically
        </button>
      </div>
      <Dialog.Root
        handle={demoDialog}
        open={open()}
        onOpenChange={handleOpenChange}
        triggerId={triggerId()}
      >
        {({ payload }) => (
          <Dialog.Portal>
            <Dialog.Backdrop class={styles.Backdrop} />
            <Dialog.Popup class={styles.Popup}>
              {payload !== undefined && (
                <Dialog.Title class={styles.Title}>Dialog {payload}</Dialog.Title>
              )}
              <div class={styles.Actions}>
                <Dialog.Close class={styles.Button}>Close</Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </Dialog.Root>
    </>
  );
}
