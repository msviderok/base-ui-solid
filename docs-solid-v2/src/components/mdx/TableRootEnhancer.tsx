import { onCleanup, onMount, type JSX } from 'solid-js';
import { observeScrollableInner } from '../../utils/observeScrollableInner';

interface Props {
  rootId: string;
}

export default function TableRootEnhancer(props: Props) {
  onMount(() => {
    const root = document.getElementById(props.rootId);
    if (!root) {
      return;
    }

    const cleanups = Array.from(
      root.querySelectorAll<HTMLElement>('th.TableCell, td.TableCell'),
    ).map((cell) => observeScrollableInner(cell));

    onCleanup(() => {
      cleanups.forEach((cleanup) => cleanup?.());
    });
  });

  return null;
}
