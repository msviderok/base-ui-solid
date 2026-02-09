import { createEffect, onCleanup, Show, type JSX } from 'solid-js';
import { useDirection } from '../../direction-provider/DirectionContext';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { ScrollAreaRoot } from '../root/ScrollAreaRoot';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { ScrollAreaRootCssVars } from '../root/ScrollAreaRootCssVars';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import { getOffset } from '../utils/getOffset';
import { ScrollAreaScrollbarContext } from './ScrollAreaScrollbarContext';
import { ScrollAreaScrollbarCssVars } from './ScrollAreaScrollbarCssVars';

/**
 * A vertical or horizontal scrollbar for the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaScrollbar(componentProps: ScrollAreaScrollbar.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'orientation',
    'keepMounted',
  ]);
  const orientation = () => local.orientation ?? 'vertical';
  const keepMounted = () => local.keepMounted ?? false;

  const {
    hovering,
    scrollingX,
    scrollingY,
    hiddenState,
    overflowEdges,
    refs,
    handlePointerDown,
    handlePointerUp,
    rootId,
    thumbSize,
  } = useScrollAreaRootContext();

  const state: ScrollAreaScrollbar.State = {
    get hovering() {
      return hovering();
    },
    get scrolling() {
      return { horizontal: scrollingX(), vertical: scrollingY() }[orientation()];
    },
    get orientation() {
      return orientation();
    },
    get hasOverflowX() {
      return !hiddenState().x;
    },
    get hasOverflowY() {
      return !hiddenState().y;
    },
    get overflowXStart() {
      return overflowEdges().xStart;
    },
    get overflowXEnd() {
      return overflowEdges().xEnd;
    },
    get overflowYStart() {
      return overflowEdges().yStart;
    },
    get overflowYEnd() {
      return overflowEdges().yEnd;
    },
    get cornerHidden() {
      return hiddenState().corner;
    },
  };

  const direction = useDirection();

  createEffect(() => {
    const viewportEl = refs.viewportRef;
    const scrollbarEl = orientation() === 'vertical' ? refs.scrollbarYRef : refs.scrollbarXRef;

    if (!scrollbarEl) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      if (!viewportEl || !scrollbarEl || event.ctrlKey) {
        return;
      }

      event.preventDefault();

      if (orientation() === 'vertical') {
        if (viewportEl.scrollTop === 0 && event.deltaY < 0) {
          return;
        }
      } else if (viewportEl.scrollLeft === 0 && event.deltaX < 0) {
        return;
      }

      if (orientation() === 'vertical') {
        if (
          viewportEl.scrollTop === viewportEl.scrollHeight - viewportEl.clientHeight &&
          event.deltaY > 0
        ) {
          return;
        }
      } else if (
        viewportEl.scrollLeft === viewportEl.scrollWidth - viewportEl.clientWidth &&
        event.deltaX > 0
      ) {
        return;
      }

      if (orientation() === 'vertical') {
        viewportEl.scrollTop += event.deltaY;
      } else {
        viewportEl.scrollLeft += event.deltaX;
      }
    }

    scrollbarEl.addEventListener('wheel', handleWheel, { passive: false });

    onCleanup(() => {
      scrollbarEl.removeEventListener('wheel', handleWheel);
    });
  });

  const props: HTMLProps = {
    get ['data-id' as string]() {
      return rootId() ? `${rootId()}-scrollbar` : undefined;
    },
    onPointerDown(event) {
      if (event.button !== 0) {
        return;
      }

      // Ignore clicks on thumb
      if (event.currentTarget !== event.target) {
        return;
      }

      const viewportEl = refs.viewportRef;
      const thumbYEl = refs.thumbYRef;
      const scrollbarYEl = refs.scrollbarYRef;
      const thumbXEl = refs.thumbXRef;
      const scrollbarXEl = refs.scrollbarXRef;

      if (!viewportEl) {
        return;
      }

      // Handle Y-axis (vertical) scroll
      if (thumbYEl && scrollbarYEl && orientation() === 'vertical') {
        const thumbYOffset = getOffset(thumbYEl, 'margin', 'y');
        const scrollbarYOffset = getOffset(scrollbarYEl, 'padding', 'y');
        const thumbHeight = thumbYEl.offsetHeight;
        const trackRectY = scrollbarYEl.getBoundingClientRect();
        const clickY =
          event.clientY - trackRectY.top - thumbHeight / 2 - scrollbarYOffset + thumbYOffset / 2;

        const scrollableContentHeight = viewportEl.scrollHeight;
        const viewportHeight = viewportEl.clientHeight;

        const maxThumbOffsetY =
          scrollbarYEl.offsetHeight - thumbHeight - scrollbarYOffset - thumbYOffset;
        const scrollRatioY = clickY / maxThumbOffsetY;
        const newScrollTop = scrollRatioY * (scrollableContentHeight - viewportHeight);

        viewportEl.scrollTop = newScrollTop;
      }

      if (thumbXEl && scrollbarXEl && orientation() === 'horizontal') {
        const thumbXOffset = getOffset(thumbXEl, 'margin', 'x');
        const scrollbarXOffset = getOffset(scrollbarXEl, 'padding', 'x');
        const thumbWidth = thumbXEl.offsetWidth;
        const trackRectX = scrollbarXEl.getBoundingClientRect();
        const clickX =
          event.clientX - trackRectX.left - thumbWidth / 2 - scrollbarXOffset + thumbXOffset / 2;

        const scrollableContentWidth = viewportEl.scrollWidth;
        const viewportWidth = viewportEl.clientWidth;

        const maxThumbOffsetX =
          scrollbarXEl.offsetWidth - thumbWidth - scrollbarXOffset - thumbXOffset;
        const scrollRatioX = clickX / maxThumbOffsetX;

        let newScrollLeft: number;
        if (direction() === 'rtl') {
          // In RTL, invert the scroll direction
          newScrollLeft = (1 - scrollRatioX) * (scrollableContentWidth - viewportWidth);

          // Adjust for browsers that use negative scrollLeft in RTL
          if (viewportEl.scrollLeft <= 0) {
            newScrollLeft = -newScrollLeft;
          }
        } else {
          newScrollLeft = scrollRatioX * (scrollableContentWidth - viewportWidth);
        }

        viewportEl.scrollLeft = newScrollLeft;
      }

      handlePointerDown(event);
    },
    onPointerUp: handlePointerUp,
    get style(): JSX.CSSProperties {
      return {
        position: 'absolute',
        'touch-action': 'none',
        ...(orientation() === 'vertical' && {
          top: 0,
          bottom: `var(${ScrollAreaRootCssVars.scrollAreaCornerHeight})`,
          'inset-inline-end': 0,
          [ScrollAreaScrollbarCssVars.scrollAreaThumbHeight as string]: `${thumbSize().height}px`,
        }),
        ...(orientation() === 'horizontal' && {
          'inset-inline-start': 0,
          'inset-inline-end': `var(${ScrollAreaRootCssVars.scrollAreaCornerWidth})`,
          bottom: 0,
          [ScrollAreaScrollbarCssVars.scrollAreaThumbWidth as string]: `${thumbSize().width}px`,
        }),
      };
    },
  };

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      if (orientation() === 'vertical') {
        refs.scrollbarYRef = el;
      } else {
        refs.scrollbarXRef = el;
      }
    },
    state,
    props: [props, elementProps],
    stateAttributesMapping: scrollAreaStateAttributesMapping,
  });

  const contextValue: ScrollAreaScrollbarContext = { orientation };

  const isHidden = () => (orientation() === 'vertical' ? hiddenState().y : hiddenState().x);

  const shouldRender = () => keepMounted() || !isHidden();

  return (
    <Show when={shouldRender()}>
      <ScrollAreaScrollbarContext.Provider value={contextValue}>
        {element()}
      </ScrollAreaScrollbarContext.Provider>
    </Show>
  );
}

export interface ScrollAreaScrollbarState extends ScrollAreaRoot.State {
  /** Whether the scroll area is being hovered. */
  hovering: boolean;
  /** Whether the scroll area is being scrolled. */
  scrolling: boolean;
  /** The orientation of the scrollbar. */
  orientation: 'vertical' | 'horizontal';
}

export interface ScrollAreaScrollbarProps extends BaseUIComponentProps<
  'div',
  ScrollAreaScrollbar.State
> {
  /**
   * Whether the scrollbar controls vertical or horizontal scroll.
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Whether to keep the HTML element in the DOM when the viewport isn’t scrollable.
   * @default false
   */
  keepMounted?: boolean;
}

export namespace ScrollAreaScrollbar {
  export type State = ScrollAreaScrollbarState;
  export type Props = ScrollAreaScrollbarProps;
}
