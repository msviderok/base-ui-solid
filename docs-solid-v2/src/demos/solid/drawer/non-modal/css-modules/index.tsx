import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import styles from './index.module.css';

export default function ExampleDrawer() {
  return (
    <Drawer.Root swipeDirection="right" modal={false} disablePointerDismissal>
      <Drawer.Trigger class={styles.Button}>Open non-modal drawer</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Viewport class={styles.Viewport}>
          <Drawer.Popup class={styles.Popup}>
            <Drawer.Content class={styles.Content}>
              <Drawer.Title class={styles.Title}>Non-modal drawer</Drawer.Title>
              <Drawer.Description class={styles.Description}>
                This drawer does not trap focus and ignores outside clicks. Use the close button or
                swipe to dismiss it.
              </Drawer.Description>
              <div class={styles.Actions}>
                <Drawer.Close class={styles.Button}>Close</Drawer.Close>
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
