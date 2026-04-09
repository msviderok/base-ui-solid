import type { JSX } from 'solid-js';
import { Dialog } from '@msviderok/base-ui-solid/dialog';
import styles from './index.module.css';

export default function ExampleUncontainedDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger class={styles.Button}>Open dialog</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop class={styles.Backdrop} />
        <Dialog.Viewport class={styles.Viewport}>
          <Dialog.Popup class={styles.PopupRoot}>
            <Dialog.Close class={styles.Close} aria-label="Close">
              <XIcon class={styles.CloseIcon} />
            </Dialog.Close>
            <div class={styles.Popup} />
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function XIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
