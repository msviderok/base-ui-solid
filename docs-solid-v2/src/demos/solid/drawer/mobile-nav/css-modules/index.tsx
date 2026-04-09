import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';
import styles from './index.module.css';

const ITEMS = [
  { href: '#', label: 'Overview' },
  { href: '#', label: 'Components' },
  { href: '#', label: 'Utilities' },
  { href: '#', label: 'Releases' },
] as const;

const LONG_LIST = Array.from({ length: 50 }, (_, i) => ({
  href: '#',
  label: `Item ${i + 1}`,
}));

export default function ExampleDrawerMobileNav() {
  return (
    <Drawer.Root>
      <Drawer.Trigger class={styles.Button}>Open mobile menu</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop class={styles.Backdrop} />
        <Drawer.Viewport class={styles.Viewport}>
          <ScrollArea.Root style={{ position: undefined }} class={styles.ScrollAreaRoot}>
            <ScrollArea.Viewport class={styles.ScrollAreaViewport}>
              <ScrollArea.Content class={styles.ScrollContent}>
                <Drawer.Popup class={styles.Popup}>
                  <nav aria-label="Navigation" class={styles.Panel}>
                    <div class={styles.Header}>
                      <div aria-hidden class={styles.HeaderSpacer} />
                      <div class={styles.Handle} />
                      <Drawer.Close aria-label="Close menu" class={styles.CloseButton}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M0.75 0.75L6 6M11.25 11.25L6 6M6 6L0.75 11.25M6 6L11.25 0.75"
                            stroke="currentcolor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </Drawer.Close>
                    </div>

                    <Drawer.Content class={styles.Content}>
                      <Drawer.Title class={styles.Title}>Menu</Drawer.Title>
                      <Drawer.Description class={styles.Description}>
                        Scroll the long list. Flick down from the top to dismiss.
                      </Drawer.Description>

                      <div class={styles.ScrollArea}>
                        <ul class={styles.List}>
                          {ITEMS.map((item) => (
                            <li key={item.label} class={styles.Item}>
                              <a class={styles.Link} href={item.href}>
                                {item.label}
                              </a>
                            </li>
                          ))}
                        </ul>

                        <ul aria-label="Long list" class={styles.LongList}>
                          {LONG_LIST.map((item) => (
                            <li key={item.label} class={styles.Item}>
                              <a class={styles.Link} href={item.href}>
                                {item.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Drawer.Content>
                  </nav>
                </Drawer.Popup>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar class={styles.Scrollbar}>
              <ScrollArea.Thumb class={styles.ScrollbarThumb} />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
