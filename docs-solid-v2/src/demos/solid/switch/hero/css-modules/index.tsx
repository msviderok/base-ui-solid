import { Switch } from '@msviderok/base-ui-solid/switch';
import styles from './index.module.css';

export default function ExampleSwitch() {
  return (
    <Switch.Root defaultChecked class={styles.Switch}>
      <Switch.Thumb class={styles.Thumb} />
    </Switch.Root>
  );
}
