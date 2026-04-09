import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import styles from './index.module.css';

export default function ExampleDrawer() {
  return (
    <Drawer.Root swipeDirection="right">
      <Drawer.Trigger class={styles.Button}>Open drawer</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop class={styles.Backdrop} />
        <Drawer.Viewport class={styles.Viewport}>
          <Drawer.Popup class={styles.Popup}>
            <Drawer.Content class={styles.Content}>
              <Drawer.Title class={styles.Title}>Drawer</Drawer.Title>
              <Drawer.Description class={styles.Description}>
                This is a drawer that slides in from the side. You can swipe to dismiss it.
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
