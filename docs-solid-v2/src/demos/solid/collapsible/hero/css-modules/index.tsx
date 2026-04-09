import { Collapsible } from '@msviderok/base-ui-solid/collapsible';
import styles from './index.module.css';

function ChevronIcon(props: { class?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class={props.class}>
      <path d="M3.5 9L7.5 5L3.5 1" stroke="currentcolor" />
    </svg>
  );
}

export default function ExampleCollapsible() {
  return (
    <Collapsible.Root class={styles.Collapsible}>
      <Collapsible.Trigger class={styles.Trigger}>
        <ChevronIcon class={styles.Icon} />
        Recovery keys
      </Collapsible.Trigger>
      <Collapsible.Panel class={styles.Panel}>
        <div class={styles.Content}>
          <div>alien-bean-pasta</div>
          <div>wild-irish-burrito</div>
          <div>horse-battery-staple</div>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
