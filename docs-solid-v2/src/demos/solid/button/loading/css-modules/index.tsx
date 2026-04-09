import { createSignal } from 'solid-js';
import { Button } from '@msviderok/base-ui-solid/button';
import styles from './index.module.css';

export default function ExampleButton() {
  const [loading, setLoading] = createSignal(false);

  return (
    <Button
      class={styles.Button}
      disabled={loading()}
      focusableWhenDisabled
      onClick={() => {
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
        }, 4000);
      }}
    >
      {loading() ? 'Submitting' : 'Submit'}
    </Button>
  );
}
