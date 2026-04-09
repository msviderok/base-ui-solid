import { ContextMenu } from '@msviderok/base-ui-solid/context-menu';
import { Menu } from '@msviderok/base-ui-solid/menu';
import type { JSX } from 'solid-js';
import styles from './index.module.css';

export default function ExampleContextMenu() {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger class={styles.Trigger}>Right click here</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner class={styles.Positioner}>
          <ContextMenu.Popup class={styles.Popup}>
            <ContextMenu.Item class={styles.Item}>Add to Library</ContextMenu.Item>

            <ContextMenu.SubmenuRoot>
              <ContextMenu.SubmenuTrigger class={styles.SubmenuTrigger}>
                Add to Playlist
                <ChevronRightIcon />
              </ContextMenu.SubmenuTrigger>
              <ContextMenu.Portal>
                <ContextMenu.Positioner class={styles.Positioner} alignOffset={-4} sideOffset={-4}>
                  <ContextMenu.Popup class={styles.SubmenuPopup}>
                    <ContextMenu.Item class={styles.Item}>Get Up!</ContextMenu.Item>
                    <ContextMenu.Item class={styles.Item}>Inside Out</ContextMenu.Item>
                    <ContextMenu.Item class={styles.Item}>Night Beats</ContextMenu.Item>
                    <Menu.Separator class={styles.Separator} />
                    <ContextMenu.Item class={styles.Item}>New playlist…</ContextMenu.Item>
                  </ContextMenu.Popup>
                </ContextMenu.Positioner>
              </ContextMenu.Portal>
            </ContextMenu.SubmenuRoot>

            <ContextMenu.Separator class={styles.Separator} />
            <ContextMenu.Item class={styles.Item}>Play Next</ContextMenu.Item>
            <ContextMenu.Item class={styles.Item}>Play Last</ContextMenu.Item>
            <ContextMenu.Separator class={styles.Separator} />
            <ContextMenu.Item class={styles.Item}>Favorite</ContextMenu.Item>
            <ContextMenu.Item class={styles.Item}>Share</ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function ChevronRightIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" {...props}>
      <path d="M3.5 9L7.5 5L3.5 1" stroke="currentcolor" stroke-width="1.5" />
    </svg>
  );
}
