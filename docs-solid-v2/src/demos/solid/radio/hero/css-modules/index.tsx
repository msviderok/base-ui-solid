import { Radio } from '@msviderok/base-ui-solid/radio';
import { RadioGroup } from '@msviderok/base-ui-solid/radio-group';
import styles from './index.module.css';

export default function ExampleRadioGroup() {
  return (
    <RadioGroup
      aria-labelledby="apples-caption"
      defaultValue="fuji-apple"
      class={styles.RadioGroup}
    >
      <div class={styles.Caption} id="apples-caption">
        Best apple
      </div>

      <label class={styles.Item}>
        <Radio.Root value="fuji-apple" class={styles.Radio}>
          <Radio.Indicator class={styles.Indicator} />
        </Radio.Root>
        Fuji
      </label>

      <label class={styles.Item}>
        <Radio.Root value="gala-apple" class={styles.Radio}>
          <Radio.Indicator class={styles.Indicator} />
        </Radio.Root>
        Gala
      </label>

      <label class={styles.Item}>
        <Radio.Root value="granny-smith-apple" class={styles.Radio}>
          <Radio.Indicator class={styles.Indicator} />
        </Radio.Root>
        Granny Smith
      </label>
    </RadioGroup>
  );
}
