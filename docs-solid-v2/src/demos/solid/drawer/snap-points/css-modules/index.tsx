import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import styles from './index.module.css';

const TOP_MARGIN_REM = 1;
const VISIBLE_SNAP_POINTS_REM = [30];

function toViewportSnapPoint(heightRem: number) {
  return `${heightRem + TOP_MARGIN_REM}rem`;
}

const snapPoints = [...VISIBLE_SNAP_POINTS_REM.map(toViewportSnapPoint), 1];

export default function ExampleDrawerSnapPoints() {
  return (
    <Drawer.Root snapPoints={snapPoints}>
      <Drawer.Trigger class={styles.Button}>Open snap drawer</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop class={styles.Backdrop} />
        <Drawer.Viewport class={styles.Viewport}>
          <Drawer.Popup
            class={styles.Popup}
            style={{ '--top-margin': `${TOP_MARGIN_REM}rem` } as Record<string, string | number>}
          >
            <div class={styles.DragArea}>
              <div class={styles.Handle} />
              <Drawer.Title class={styles.Title}>Snap points</Drawer.Title>
            </div>
            <Drawer.Content class={styles.Scroll}>
              <div class={styles.Content}>
                <Drawer.Description class={styles.Description}>
                  Drag the sheet to snap between a compact peek and a near full-height view.
                </Drawer.Description>
                <div class={styles.Cards} aria-hidden>
                  {Array.from({ length: 20 }, (_, index) => (
                    <div class={styles.Card} key={index} />
                  ))}
                </div>
                <div class={styles.Actions}>
                  <Drawer.Close class={styles.Button}>Close</Drawer.Close>
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
