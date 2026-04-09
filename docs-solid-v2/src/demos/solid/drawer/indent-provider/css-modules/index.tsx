import { createSignal } from 'solid-js';
import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import styles from './index.module.css';

export default function ExampleDrawer() {
  const [portalContainer, setPortalContainer] = createSignal<HTMLDivElement | null>(null);

  return (
    <Drawer.Provider>
      <div class={styles.Root} ref={setPortalContainer}>
        <Drawer.IndentBackground class={styles.IndentBackground} />
        <Drawer.Indent class={styles.Indent}>
          <div class={styles.Center}>
            <Drawer.Root modal={false}>
              <Drawer.Trigger class={styles.Button}>Open drawer</Drawer.Trigger>
              <Drawer.Portal container={portalContainer()}>
                <Drawer.Backdrop class={styles.Backdrop} />
                <Drawer.Viewport class={styles.Viewport}>
                  <Drawer.Popup class={styles.Popup}>
                    <div class={styles.Handle} />
                    <Drawer.Content class={styles.Content}>
                      <Drawer.Title class={styles.Title}>Notifications</Drawer.Title>
                      <Drawer.Description class={styles.Description}>
                        You are all caught up. Good job!
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
        </Drawer.Indent>
      </div>
    </Drawer.Provider>
  );
}
