import { createSignal, onCleanup, onMount } from 'solid-js';
import { render } from 'solid-js/web';
import { CheckIcon } from '../../icons/CheckIcon';
import { CopyIcon } from '../../icons/CopyIcon';
import { GhostButton } from '../GhostButton';

interface Props {
  rootId: string;
}

function CopyButton(props: { getText: () => string }) {
  const [copied, setCopied] = createSignal(false);
  let timeoutId: number | undefined;

  onCleanup(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  });

  return (
    <GhostButton
      class="ml-auto"
      aria-label="Copy code"
      onClick={async () => {
        const text = props.getText();
        if (!text) {
          return;
        }

        await navigator.clipboard.writeText(text);
        setCopied(true);

        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
          setCopied(false);
          timeoutId = undefined;
        }, 2000);
      }}
    >
      Copy
      <span class="flex size-[14px] items-center justify-center">
        {copied() ? <CheckIcon /> : <CopyIcon />}
      </span>
    </GhostButton>
  );
}

export default function CodeBlockEnhancer(props: Props) {
  onMount(() => {
    const root = document.getElementById(props.rootId);
    if (!root) {
      return;
    }

    const panel = root.querySelector<HTMLElement>('.CodeBlockPanel');
    const title = root.querySelector<HTMLElement>('.CodeBlockPanelTitle');
    const pre = root.querySelector<HTMLElement>('pre.CodeBlockPre');
    const preContainer = root.querySelector<HTMLElement>('.CodeBlockPreContainer');

    const uid = props.rootId;
    if (title) {
      title.id = `${uid}-title`;
      root.setAttribute('aria-labelledby', title.id);
    } else if (pre) {
      root.setAttribute('aria-labelledby', `${uid}-code`);
    }

    if (pre) {
      pre.id = `${uid}-code`;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'a' &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault();
        window.getSelection()?.selectAllChildren(event.currentTarget as Node);
      }
    }

    preContainer?.addEventListener('keydown', handleKeyDown);

    let disposeButton: (() => void) | undefined;
    let mountPoint: HTMLDivElement | undefined;

    if (panel && pre) {
      mountPoint = document.createElement('div');
      panel.appendChild(mountPoint);
      disposeButton = render(
        () => <CopyButton getText={() => pre.textContent ?? ''} />,
        mountPoint,
      );
    }

    onCleanup(() => {
      preContainer?.removeEventListener('keydown', handleKeyDown);
      disposeButton?.();
      mountPoint?.remove();
    });
  });

  return null;
}
