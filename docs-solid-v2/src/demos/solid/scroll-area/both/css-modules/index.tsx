import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';
import styles from './index.module.css';

export default function ExampleScrollAreaBoth() {
  return (
    <ScrollArea.Root class={styles.ScrollArea}>
      <ScrollArea.Viewport class={styles.Viewport}>
        <ScrollArea.Content class={styles.Content}>
          <ul class={styles.Grid}>
            {Array.from({ length: 100 }, (_, i) => (
              <li key={i} class={styles.Item}>
                {i + 1}
              </li>
            ))}
          </ul>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar class={styles.Scrollbar}>
        <ScrollArea.Thumb class={styles.Thumb} />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar class={styles.Scrollbar} orientation="horizontal">
        <ScrollArea.Thumb class={styles.Thumb} />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}
