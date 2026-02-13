import { onCleanup, onMount } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useToastRootContext } from '../root/ToastRootContext';

/**
 * A container for the contents of a toast.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastContent(componentProps: ToastContent.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { visibleIndex, expanded, recalculateHeight } = useToastRootContext();

  let contentRef: HTMLDivElement | null | undefined;

  onMount(() => {
    const node = contentRef;
    if (!node) {
      return;
    }

    recalculateHeight();

    if (typeof ResizeObserver !== 'function' || typeof MutationObserver !== 'function') {
      return;
    }

    const resizeObserver = new ResizeObserver(() => recalculateHeight(true));
    const mutationObserver = new MutationObserver(() => recalculateHeight(true));

    resizeObserver.observe(node);
    mutationObserver.observe(node, { childList: true, subtree: true, characterData: true });

    onCleanup(() => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    });
  });

  const behind = () => visibleIndex() > 0;

  const state: ToastContent.State = {
    get expanded() {
      return expanded();
    },
    get behind() {
      return behind();
    },
  };

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      contentRef = el;
    },
    state,
    props: elementProps,
  });

  return <>{element()}</>;
}

export interface ToastContentState {
  /**
   * Whether the toast viewport is expanded.
   */
  expanded: boolean;
  /**
   * Whether the toast is behind the frontmost toast in the stack.
   */
  behind: boolean;
}

export interface ToastContentProps extends BaseUIComponentProps<'div', ToastContent.State> {}

export namespace ToastContent {
  export type State = ToastContentState;
  export type Props = ToastContentProps;
}
