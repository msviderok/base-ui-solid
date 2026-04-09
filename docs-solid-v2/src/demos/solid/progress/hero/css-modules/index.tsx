import { Progress } from '@msviderok/base-ui-solid/progress';
import { createSignal, onCleanup, onMount } from 'solid-js';
import styles from './index.module.css';

export default function ExampleProgress() {
  const [value, setValue] = createSignal(20);

  // Simulate changes
  onMount(() => {
    const interval = setInterval(() => {
      setValue((current) => Math.min(100, Math.round(current + Math.random() * 25)));
    }, 1000);

    onCleanup(() => clearInterval(interval));
  });

  return (
    <Progress.Root class={styles.Progress} value={value()}>
      <Progress.Label class={styles.Label}>Export data</Progress.Label>
      <Progress.Value class={styles.Value} />
      <Progress.Track class={styles.Track}>
        <Progress.Indicator class={styles.Indicator} />
      </Progress.Track>
    </Progress.Root>
  );
}
