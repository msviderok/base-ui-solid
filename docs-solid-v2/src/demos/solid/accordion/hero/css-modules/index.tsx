import { Accordion } from '@msviderok/base-ui-solid/accordion';
import type { JSX } from 'solid-js';
import styles from './index.module.css';

export default function ExampleAccordion() {
  return (
    <Accordion.Root class={styles.Accordion}>
      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            What is Base UI?
            <PlusIcon class={styles.TriggerIcon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>
            Base UI is a library of high-quality unstyled React components for design systems and
            web apps.
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            How do I get started?
            <PlusIcon class={styles.TriggerIcon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>
            Head to the “Quick start” guide in the docs. If you’ve used unstyled libraries before,
            you’ll feel at home.
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            Can I use it for my project?
            <PlusIcon class={styles.TriggerIcon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>Of course! Base UI is free and open source.</div>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

function PlusIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentcolor" {...props}>
      <path d="M6.75 0H5.25V5.25H0V6.75L5.25 6.75V12H6.75V6.75L12 6.75V5.25H6.75V0Z" />
    </svg>
  );
}
