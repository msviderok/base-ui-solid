import { NumberField } from '@msviderok/base-ui-solid/number-field';
import { createUniqueId } from 'solid-js';
import type { JSX } from 'solid-js';
import styles from './index.module.css';

export default function ExampleNumberField() {
  const id = createUniqueId();
  return (
    <NumberField.Root id={id} defaultValue={100} class={styles.Field}>
      <NumberField.ScrubArea class={styles.ScrubArea}>
        <label for={id} class={styles.Label}>
          Amount
        </label>
        <NumberField.ScrubAreaCursor class={styles.ScrubAreaCursor}>
          <CursorGrowIcon />
        </NumberField.ScrubAreaCursor>
      </NumberField.ScrubArea>

      <NumberField.Group class={styles.Group}>
        <NumberField.Decrement class={styles.Decrement}>
          <MinusIcon />
        </NumberField.Decrement>
        <NumberField.Input class={styles.Input} />
        <NumberField.Increment class={styles.Increment}>
          <PlusIcon />
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}

function CursorGrowIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      width="26"
      height="14"
      viewBox="0 0 24 14"
      fill="black"
      stroke="white"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19.5 5.5L6.49737 5.51844V2L1 6.9999L6.5 12L6.49737 8.5L19.5 8.5V12L25 6.9999L19.5 2V5.5Z" />
    </svg>
  );
}

function PlusIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentcolor"
      stroke-width="1.6"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 5H5M10 5H5M5 5V0M5 5V10" />
    </svg>
  );
}

function MinusIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentcolor"
      stroke-width="1.6"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 5H10" />
    </svg>
  );
}
