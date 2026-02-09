import { isWebKit } from '@base-ui/utils/detectBrowser';
import { batch, createEffect, on, onCleanup, onMount, type ComponentProps } from 'solid-js';
import { useDirection } from '../../direction-provider/DirectionContext';
import { splitComponentProps } from '../../solid-helpers';
import { clamp } from '../../utils/clamp';
import { styleDisableScrollbar } from '../../utils/styles';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { MIN_THUMB_SIZE } from '../constants';
import type { ScrollAreaRoot } from '../root/ScrollAreaRoot';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { scrollAreaStateAttributesMapping } from '../root/stateAttributes';
import { getOffset } from '../utils/getOffset';
import { onVisible } from '../utils/onVisible';
import { ScrollAreaViewportContext } from './ScrollAreaViewportContext';
import { ScrollAreaViewportCssVars } from './ScrollAreaViewportCssVars';

// Module-level flag to ensure we only register the CSS properties once,
// regardless of how many Scroll Area components are mounted.
let scrollAreaOverflowVarsRegistered = false;

/**
 * Removes inheritance of the scroll area overflow CSS variables, which
 * improves rendering performance in complex scroll areas with deep subtrees.
 * Instead, each child must manually opt-in to using these properties by
 * specifying `inherit`.
 * See https://motion.dev/blog/web-animation-performance-tier-list
 * under the "Improving CSS variable performance" section.
 */
function removeCSSVariableInheritance() {
  if (
    scrollAreaOverflowVarsRegistered ||
    // When `inherits: false`, specifying `inherit` on child elements doesn't work
    // in Safari. To let CSS features work correctly, this optimization must be skipped.
    isWebKit
  ) {
    return;
  }

  if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
    [
      ScrollAreaViewportCssVars.scrollAreaOverflowXStart,
      ScrollAreaViewportCssVars.scrollAreaOverflowXEnd,
      ScrollAreaViewportCssVars.scrollAreaOverflowYStart,
      ScrollAreaViewportCssVars.scrollAreaOverflowYEnd,
    ].forEach((name) => {
      try {
        CSS.registerProperty({
          name,
          syntax: '<length>',
          inherits: false,
          initialValue: '0px',
        });
      } catch {
        /* ignore already-registered */
      }
    });
  }

  scrollAreaOverflowVarsRegistered = true;
}

/**
 * The actual scrollable container of the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaViewport(componentProps: ScrollAreaViewport.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const {
    refs,
    cornerSize,
    setCornerSize,
    setThumbSize,
    rootId,
    setHiddenState,
    hiddenState,
    handleScroll,
    setHovering,
    setOverflowEdges,
    overflowEdges,
    overflowEdgeThreshold,
  } = useScrollAreaRootContext();

  const direction = useDirection();

  let programmaticScrollRef = true;

  const scrollEndTimeout = useTimeout();
  const waitForAnimationsTimeout = useTimeout();

  function computeThumbPosition() {
    batch(() => {
      const viewportEl = refs.viewportRef;
      const scrollbarXEl = refs.scrollbarXRef;
      const scrollbarYEl = refs.scrollbarYRef;
      const thumbXEl = refs.thumbXRef;
      const thumbYEl = refs.thumbYRef;
      const cornerEl = refs.cornerRef;

      if (!viewportEl) {
        return;
      }

      const scrollableContentHeight = viewportEl.scrollHeight;
      const scrollableContentWidth = viewportEl.scrollWidth;
      const viewportHeight = viewportEl.clientHeight;
      const viewportWidth = viewportEl.clientWidth;
      const scrollTop = viewportEl.scrollTop;
      const scrollLeft = viewportEl.scrollLeft;

      if (scrollableContentHeight === 0 || scrollableContentWidth === 0) {
        return;
      }

      const scrollbarYHidden = viewportHeight >= scrollableContentHeight;
      const scrollbarXHidden = viewportWidth >= scrollableContentWidth;
      const ratioX = viewportWidth / scrollableContentWidth;
      const ratioY = viewportHeight / scrollableContentHeight;
      const maxScrollLeft = Math.max(0, scrollableContentWidth - viewportWidth);
      const maxScrollTop = Math.max(0, scrollableContentHeight - viewportHeight);

      let scrollLeftFromStart = 0;
      let scrollLeftFromEnd = 0;
      if (!scrollbarXHidden) {
        if (direction() === 'rtl') {
          scrollLeftFromStart = clamp(-scrollLeft, 0, maxScrollLeft);
        } else {
          scrollLeftFromStart = clamp(scrollLeft, 0, maxScrollLeft);
        }
        scrollLeftFromEnd = maxScrollLeft - scrollLeftFromStart;
      }

      const scrollTopFromStart = !scrollbarYHidden ? clamp(scrollTop, 0, maxScrollTop) : 0;
      const scrollTopFromEnd = !scrollbarYHidden ? maxScrollTop - scrollTopFromStart : 0;
      const nextWidth = scrollbarXHidden ? 0 : viewportWidth;
      const nextHeight = scrollbarYHidden ? 0 : viewportHeight;

      let nextCornerWidth = 0;
      let nextCornerHeight = 0;
      if (!scrollbarXHidden && !scrollbarYHidden) {
        nextCornerWidth = scrollbarYEl?.offsetWidth || 0;
        nextCornerHeight = scrollbarXEl?.offsetHeight || 0;
      }

      // Only subtract corner size from scrollbar dimensions if the corner hasn't been sized yet.
      // Once sized, the layout will already account for it.
      const cornerNotYetSized = cornerSize().width === 0 && cornerSize().height === 0;
      const cornerWidthOffset = cornerNotYetSized ? nextCornerWidth : 0;
      const cornerHeightOffset = cornerNotYetSized ? nextCornerHeight : 0;

      const scrollbarXOffset = getOffset(scrollbarXEl, 'padding', 'x');
      const scrollbarYOffset = getOffset(scrollbarYEl, 'padding', 'y');
      const thumbXOffset = getOffset(thumbXEl, 'margin', 'x');
      const thumbYOffset = getOffset(thumbYEl, 'margin', 'y');

      const idealNextWidth = nextWidth - scrollbarXOffset - thumbXOffset;
      const idealNextHeight = nextHeight - scrollbarYOffset - thumbYOffset;

      const maxNextWidth = scrollbarXEl
        ? Math.min(scrollbarXEl.offsetWidth - cornerWidthOffset, idealNextWidth)
        : idealNextWidth;
      const maxNextHeight = scrollbarYEl
        ? Math.min(scrollbarYEl.offsetHeight - cornerHeightOffset, idealNextHeight)
        : idealNextHeight;

      const clampedNextWidth = Math.max(MIN_THUMB_SIZE, maxNextWidth * ratioX);
      const clampedNextHeight = Math.max(MIN_THUMB_SIZE, maxNextHeight * ratioY);

      setThumbSize((prevSize) => {
        if (prevSize.height === clampedNextHeight && prevSize.width === clampedNextWidth) {
          return prevSize;
        }

        return {
          width: clampedNextWidth,
          height: clampedNextHeight,
        };
      });

      // Handle Y (vertical) scroll
      if (scrollbarYEl && thumbYEl) {
        const maxThumbOffsetY =
          scrollbarYEl.offsetHeight - clampedNextHeight - scrollbarYOffset - thumbYOffset;
        const scrollRangeY = scrollableContentHeight - viewportHeight;
        const scrollRatioY = scrollRangeY === 0 ? 0 : scrollTop / scrollRangeY;

        // In Safari, don't allow it to go negative or too far as `scrollTop` considers the rubber
        // band effect.
        const thumbOffsetY = Math.min(maxThumbOffsetY, Math.max(0, scrollRatioY * maxThumbOffsetY));

        thumbYEl.style.transform = `translate3d(0,${thumbOffsetY}px,0)`;
      }

      // Handle X (horizontal) scroll
      if (scrollbarXEl && thumbXEl) {
        const maxThumbOffsetX =
          scrollbarXEl.offsetWidth - clampedNextWidth - scrollbarXOffset - thumbXOffset;
        const scrollRangeX = scrollableContentWidth - viewportWidth;
        const scrollRatioX = scrollRangeX === 0 ? 0 : scrollLeft / scrollRangeX;

        // In Safari, don't allow it to go negative or too far as `scrollLeft` considers the rubber
        // band effect.
        const thumbOffsetX =
          direction() === 'rtl'
            ? clamp(scrollRatioX * maxThumbOffsetX, -maxThumbOffsetX, 0)
            : clamp(scrollRatioX * maxThumbOffsetX, 0, maxThumbOffsetX);

        thumbXEl.style.transform = `translate3d(${thumbOffsetX}px,0,0)`;
      }

      const clampedScrollLeftStart = clamp(scrollLeftFromStart, 0, maxScrollLeft);
      const clampedScrollLeftEnd = clamp(scrollLeftFromEnd, 0, maxScrollLeft);
      const clampedScrollTopStart = clamp(scrollTopFromStart, 0, maxScrollTop);
      const clampedScrollTopEnd = clamp(scrollTopFromEnd, 0, maxScrollTop);

      const overflowMetricsPx: Array<[ScrollAreaViewportCssVars, number]> = [
        [ScrollAreaViewportCssVars.scrollAreaOverflowXStart, clampedScrollLeftStart],
        [ScrollAreaViewportCssVars.scrollAreaOverflowXEnd, clampedScrollLeftEnd],
        [ScrollAreaViewportCssVars.scrollAreaOverflowYStart, clampedScrollTopStart],
        [ScrollAreaViewportCssVars.scrollAreaOverflowYEnd, clampedScrollTopEnd],
      ];

      for (const [cssVar, value] of overflowMetricsPx) {
        viewportEl.style.setProperty(cssVar, `${value}px`);
      }

      if (cornerEl) {
        if (scrollbarXHidden || scrollbarYHidden) {
          setCornerSize({ width: 0, height: 0 });
        } else if (!scrollbarXHidden && !scrollbarYHidden) {
          setCornerSize({ width: nextCornerWidth, height: nextCornerHeight });
        }
      }

      setHiddenState((prevState) => {
        const cornerHidden = scrollbarYHidden || scrollbarXHidden;

        if (
          prevState.y === scrollbarYHidden &&
          prevState.x === scrollbarXHidden &&
          prevState.corner === cornerHidden
        ) {
          return prevState;
        }

        return {
          y: scrollbarYHidden,
          x: scrollbarXHidden,
          corner: cornerHidden,
        };
      });

      const nextOverflowEdges = {
        xStart: !scrollbarXHidden && clampedScrollLeftStart > overflowEdgeThreshold().xStart,
        xEnd: !scrollbarXHidden && clampedScrollLeftEnd > overflowEdgeThreshold().xEnd,
        yStart: !scrollbarYHidden && clampedScrollTopStart > overflowEdgeThreshold().yStart,
        yEnd: !scrollbarYHidden && clampedScrollTopEnd > overflowEdgeThreshold().yEnd,
      };

      setOverflowEdges((prev) => {
        if (
          prev.xStart === nextOverflowEdges.xStart &&
          prev.xEnd === nextOverflowEdges.xEnd &&
          prev.yStart === nextOverflowEdges.yStart &&
          prev.yEnd === nextOverflowEdges.yEnd
        ) {
          return prev;
        }
        return nextOverflowEdges;
      });
    });
  }

  onMount(() => {
    if (!refs.viewportRef) {
      return;
    }

    removeCSSVariableInheritance();

    let hasInitialized = false;
    onCleanup(
      onVisible(refs.viewportRef!, () => {
        if (!hasInitialized) {
          hasInitialized = true;
          return;
        }
        computeThumbPosition();
      }),
    );
  });

  createEffect(
    on([hiddenState, direction], () => {
      // Wait for scrollbar-related refs to be set
      queueMicrotask(computeThumbPosition);
    }),
  );

  onMount(() => {
    // `onMouseEnter` doesn't fire upon load, so we need to check if the viewport is already
    // being hovered.
    if (refs.viewportRef?.matches(':hover')) {
      setHovering(true);
    }
  });

  onMount(() => {
    const viewport = refs.viewportRef;
    if (typeof ResizeObserver === 'undefined' || !viewport) {
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

    ro.observe(viewport);

    // If there are animations in the viewport, wait for them to finish and then recompute the thumb position.
    // This is necessary when the viewport contains a Dialog that is animating its popup on open
    // and the popup is using a transform for the animation, which affects the size of the viewport.
    // Without this, the thumb position will be incorrect until scrolling (i.e. if the scrollbar shows
    // on hover, the thumb has an incorrect size).
    // We assume the user is using `onOpenChangeComplete` to hide the scrollbar
    // until animations complete because otherwise the scrollbar would show the thumb resizing mid-animation.
    waitForAnimationsTimeout.start(0, () => {
      const animations = viewport.getAnimations({ subtree: true });
      if (animations.length === 0) {
        return;
      }

      Promise.all(animations.map((animation) => animation.finished))
        .then(computeThumbPosition)
        .catch(() => {});
    });

    onCleanup(() => {
      ro.disconnect();
      waitForAnimationsTimeout.clear();
    });
  });

  function handleUserInteraction() {
    programmaticScrollRef = false;
  }

  const contextValue: ScrollAreaViewportContext = {
    computeThumbPosition,
  };

  const props: ComponentProps<'div'> = {
    role: 'presentation',
    get ['data-id' as string]() {
      return rootId() ? `${rootId()}-viewport` : undefined;
    },
    // https://accessibilityinsights.io/info-examples/web/scrollable-region-focusable/
    get tabIndex() {
      return !hiddenState().x || !hiddenState().y ? 0 : undefined;
    },
    class: styleDisableScrollbar.class,
    style: {
      overflow: 'scroll',
    },
    onScroll: () => {
      if (!refs.viewportRef) {
        return;
      }

      computeThumbPosition();

      if (!programmaticScrollRef) {
        handleScroll({
          x: refs.viewportRef?.scrollLeft,
          y: refs.viewportRef?.scrollTop,
        });
      }

      // Debounce the restoration of the programmatic flag so that it only
      // flips back to `true` once scrolling has come to a rest. This ensures
      // that momentum scrolling (where no further user-interaction events fire)
      // is still treated as user-driven.
      // 100 ms without scroll events ≈ scroll end
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event
      scrollEndTimeout.start(100, () => {
        programmaticScrollRef = true;
      });
    },
    onWheel: handleUserInteraction,
    onTouchMove: handleUserInteraction,
    onPointerMove: handleUserInteraction,
    onPointerEnter: handleUserInteraction,
    onKeyDown: handleUserInteraction,
  };

  const viewportState: ScrollAreaViewport.State = {
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

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      refs.viewportRef = el;
    },
    state: viewportState,
    props: [props, elementProps],
    stateAttributesMapping: scrollAreaStateAttributesMapping,
  });

  return (
    <ScrollAreaViewportContext.Provider value={contextValue}>
      {element()}
    </ScrollAreaViewportContext.Provider>
  );
}

export interface ScrollAreaViewportProps extends BaseUIComponentProps<
  'div',
  ScrollAreaViewport.State
> {}

export interface ScrollAreaViewportState extends ScrollAreaRoot.State {}

export namespace ScrollAreaViewport {
  export type Props = ScrollAreaViewportProps;
  export type State = ScrollAreaViewportState;
}
