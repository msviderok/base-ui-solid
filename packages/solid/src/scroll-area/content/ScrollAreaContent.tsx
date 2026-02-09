import { onCleanup, onMount } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { ScrollAreaRoot } from '../root/ScrollAreaRoot';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import { useScrollAreaViewportContext } from '../viewport/ScrollAreaViewportContext';

/**
 * A container for the content of the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaContent(componentProps: ScrollAreaContent.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  let contentWrapperRef: HTMLDivElement | null | undefined;

  const { computeThumbPosition } = useScrollAreaViewportContext();
  const { viewportState } = useScrollAreaRootContext();

  onMount(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    let hasInitialized = false;
    const ro = new ResizeObserver(() => {
      // ResizeObserver fires once upon observing, so we skip the initial call
      // to avoid double-calculating the thumb position on mount.
      if (!hasInitialized) {
        hasInitialized = true;
        return;
      }
      computeThumbPosition();
    });

    if (contentWrapperRef) {
      ro.observe(contentWrapperRef);
    }

    onCleanup(() => {
      ro.disconnect();
    });
  });

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      contentWrapperRef = el;
    },
    state: viewportState,
    stateAttributesMapping: scrollAreaStateAttributesMapping,
    props: [
      {
        role: 'presentation',
        style: {
          'min-width': 'fit-content',
        },
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface ScrollAreaContentState extends ScrollAreaRoot.State {}

export interface ScrollAreaContentProps extends BaseUIComponentProps<
  'div',
  ScrollAreaContent.State
> {}

export namespace ScrollAreaContent {
  export type State = ScrollAreaContentState;
  export type Props = ScrollAreaContentProps;
}
