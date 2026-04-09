import { createSignal } from 'solid-js';
import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import styles from './index.module.css';

const ACTIONS = ['Unfollow', 'Mute', 'Add to Favourites', 'Add to Close Friends', 'Restrict'];

export default function ExampleDrawerUncontained() {
  const [open, setOpen] = createSignal(false);

  return (
    <Drawer.Root open={open()} onOpenChange={setOpen}>
      <Drawer.Trigger class={styles.Button}>Open action sheet</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop class={styles.Backdrop} />
        <Drawer.Viewport class={styles.Viewport}>
          <Drawer.Popup class={styles.Popup}>
            <Drawer.Content class={styles.Surface}>
              <Drawer.Title class={styles.VisuallyHidden}>Profile actions</Drawer.Title>
              <Drawer.Description class={styles.VisuallyHidden}>
                Choose an action for this user.
              </Drawer.Description>

              <ul class={styles.Actions} aria-label="Profile actions">
                {ACTIONS.map((action, index) => (
                  <li key={action} class={styles.Action}>
                    {index === 0 && (
                      <Drawer.Close class={styles.VisuallyHidden}>
                        Close action sheet
                      </Drawer.Close>
                    )}
                    <button
                      type="button"
                      class={styles.ActionButton}
                      onClick={() => setOpen(false)}
                    >
                      {action}
                    </button>
                  </li>
                ))}
              </ul>
            </Drawer.Content>
            <div class={styles.DangerSurface}>
              <button type="button" class={styles.DangerButton} onClick={() => setOpen(false)}>
                Block User
              </button>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
