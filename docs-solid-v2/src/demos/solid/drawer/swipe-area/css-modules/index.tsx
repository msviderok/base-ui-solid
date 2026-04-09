import { createSignal } from 'solid-js';
import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import styles from './index.module.css';

export default function ExampleDrawerSwipeArea() {
  const [portalContainer, setPortalContainer] = createSignal<HTMLDivElement | null>(null);

  return (
    <div class={styles.Root} ref={setPortalContainer}>
      <Drawer.Root swipeDirection="right" modal={false}>
        {/* <Drawer.SwipeArea class={styles.SwipeArea}>
          <span class={styles.SwipeLabel}>Swipe here</span>
        </Drawer.SwipeArea> */}
        <div class={styles.Center}>
          <div class={styles.Instructions}>
            <p class={styles.Hint}>Swipe from the right edge to open the drawer.</p>
          </div>
        </div>
        <Drawer.Portal container={portalContainer()}>
          <Drawer.Backdrop class={styles.Backdrop} />
          <Drawer.Viewport class={styles.Viewport}>
            <Drawer.Popup class={styles.Popup}>
              <Drawer.Content class={styles.Content}>
                <Drawer.Title class={styles.Title}>Library</Drawer.Title>
                <Drawer.Description class={styles.Description}>
                  Swipe from the edge whenever you want to jump back into your playlists.
                </Drawer.Description>
                <div class={styles.Actions}>
                  <Drawer.Close class={styles.Button}>Close</Drawer.Close>
                </div>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
