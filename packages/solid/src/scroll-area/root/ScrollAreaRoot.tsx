import { batch, createMemo, createSignal, type JSX } from 'solid-js';
import { useCSPContext } from '../../csp-provider/CSPContext';
import { contains } from '../../floating-ui-solid/utils';
import { splitComponentProps, useRef } from '../../solid-helpers';
import { useStyleDisableScrollbar } from '../../utils/styles';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { SCROLL_TIMEOUT } from '../constants';
import { ScrollAreaScrollbarDataAttributes } from '../scrollbar/ScrollAreaScrollbarDataAttributes';
import { getOffset } from '../utils/getOffset';
import { ScrollAreaRootContext } from './ScrollAreaRootContext';
import { ScrollAreaRootCssVars } from './ScrollAreaRootCssVars';
import { scrollAreaStateAttributesMapping } from './stateAttributes';

const DEFAULT_COORDS = { x: 0, y: 0 };
const DEFAULT_SIZE = { width: 0, height: 0 };
const DEFAULT_OVERFLOW_EDGES = { xStart: false, xEnd: false, yStart: false, yEnd: false };
const DEFAULT_HIDDEN_STATE = { x: false, y: false, corner: false };

export type HiddenState = typeof DEFAULT_HIDDEN_STATE;
export type OverflowEdges = typeof DEFAULT_OVERFLOW_EDGES;
export type Size = typeof DEFAULT_SIZE;
export type Coords = typeof DEFAULT_COORDS;

/**
 * Groups all parts of the scroll area.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaRoot(componentProps: ScrollAreaRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['overflowEdgeThreshold']);

  const overflowEdgeThreshold = createMemo(() =>
    normalizeOverflowEdgeThreshold(local.overflowEdgeThreshold),
  );

  const rootId = useBaseUiId();

  const scrollYTimeout = useTimeout();
  const scrollXTimeout = useTimeout();
  const csp = useCSPContext();

  const [hovering, setHovering] = createSignal(false);
  const [scrollingX, setScrollingX] = createSignal(false);
  const [scrollingY, setScrollingY] = createSignal(false);
  const [touchModality, setTouchModality] = createSignal(false);
  const [cornerSize, setCornerSize] = createSignal<Size>(DEFAULT_SIZE);
  const [thumbSize, setThumbSize] = createSignal<Size>(DEFAULT_SIZE);
  const [overflowEdges, setOverflowEdges] = createSignal(DEFAULT_OVERFLOW_EDGES);
  const [hiddenState, setHiddenState] = createSignal(DEFAULT_HIDDEN_STATE);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scrollbarYRef = useRef<HTMLDivElement | null>(null);
  const scrollbarXRef = useRef<HTMLDivElement | null>(null);
  const thumbYRef = useRef<HTMLDivElement | null>(null);
  const thumbXRef = useRef<HTMLDivElement | null>(null);
  const cornerRef = useRef<HTMLDivElement | null>(null);

  let thumbDraggingRef = false;
  let startYRef = 0;
  let startXRef = 0;
  let startScrollTopRef = 0;
  let startScrollLeftRef = 0;
  let currentOrientationRef: 'vertical' | 'horizontal' = 'vertical';
  let scrollPositionRef = DEFAULT_COORDS;

  function handleScroll(scrollPosition: Coords) {
    const offsetX = scrollPosition.x - scrollPositionRef.x;
    const offsetY = scrollPosition.y - scrollPositionRef.y;
    scrollPositionRef = scrollPosition;

    if (offsetY !== 0) {
      setScrollingY(true);

      scrollYTimeout.start(SCROLL_TIMEOUT, () => {
        setScrollingY(false);
      });
    }

    if (offsetX !== 0) {
      setScrollingX(true);

      scrollXTimeout.start(SCROLL_TIMEOUT, () => {
        setScrollingX(false);
      });
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }

    thumbDraggingRef = true;
    startYRef = event.clientY;
    startXRef = event.clientX;
    currentOrientationRef = (event.currentTarget as HTMLElement).getAttribute(
      ScrollAreaScrollbarDataAttributes.orientation,
    ) as 'vertical' | 'horizontal';

    if (viewportRef.current) {
      startScrollTopRef = viewportRef.current.scrollTop;
      startScrollLeftRef = viewportRef.current.scrollLeft;
    }

    if (thumbYRef.current && currentOrientationRef === 'vertical') {
      thumbYRef.current.setPointerCapture(event.pointerId);
    }
    if (thumbXRef.current && currentOrientationRef === 'horizontal') {
      thumbXRef.current.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (!thumbDraggingRef) {
      return;
    }

    const deltaY = event.clientY - startYRef;
    const deltaX = event.clientX - startXRef;

    if (viewportRef.current) {
      const scrollableContentHeight = viewportRef.current.scrollHeight;
      const viewportHeight = viewportRef.current.clientHeight;
      const scrollableContentWidth = viewportRef.current.scrollWidth;
      const viewportWidth = viewportRef.current.clientWidth;

      if (thumbYRef.current && scrollbarYRef.current && currentOrientationRef === 'vertical') {
        const scrollbarYOffset = getOffset(scrollbarYRef.current, 'padding', 'y');
        const thumbYOffset = getOffset(thumbYRef.current, 'margin', 'y');
        const thumbHeight = thumbYRef.current.offsetHeight;
        const maxThumbOffsetY =
          scrollbarYRef.current.offsetHeight - thumbHeight - scrollbarYOffset - thumbYOffset;
        const scrollRatioY = deltaY / maxThumbOffsetY;
        viewportRef.current.scrollTop =
          startScrollTopRef + scrollRatioY * (scrollableContentHeight - viewportHeight);
        event.preventDefault();

        setScrollingY(true);

        scrollYTimeout.start(SCROLL_TIMEOUT, () => {
          setScrollingY(false);
        });
      }

      if (thumbXRef.current && scrollbarXRef.current && currentOrientationRef === 'horizontal') {
        const scrollbarXOffset = getOffset(scrollbarXRef.current, 'padding', 'x');
        const thumbXOffset = getOffset(thumbXRef.current, 'margin', 'x');
        const thumbWidth = thumbXRef.current.offsetWidth;
        const maxThumbOffsetX =
          scrollbarXRef.current.offsetWidth - thumbWidth - scrollbarXOffset - thumbXOffset;
        const scrollRatioX = deltaX / maxThumbOffsetX;
        viewportRef.current.scrollLeft =
          startScrollLeftRef + scrollRatioX * (scrollableContentWidth - viewportWidth);
        event.preventDefault();

        setScrollingX(true);

        scrollXTimeout.start(SCROLL_TIMEOUT, () => {
          setScrollingX(false);
        });
      }
    }
  }

  function handlePointerUp(event: PointerEvent) {
    thumbDraggingRef = false;

    if (thumbYRef.current && currentOrientationRef === 'vertical') {
      thumbYRef.current.releasePointerCapture(event.pointerId);
    }
    if (thumbXRef.current && currentOrientationRef === 'horizontal') {
      thumbXRef.current.releasePointerCapture(event.pointerId);
    }
  }

  function handleTouchModalityChange(event: PointerEvent) {
    setTouchModality(event.pointerType === 'touch');
  }

  function handlePointerEnterOrMove(event: PointerEvent) {
    batch(() => {
      handleTouchModalityChange(event);

      if (event.pointerType !== 'touch') {
        const isTargetRootChild = contains(rootRef.current, event.target as Element);
        setHovering(isTargetRootChild);
      }
    });
  }

  const state: ScrollAreaRoot.State = {
    get scrolling() {
      return scrollingX() || scrollingY();
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

  const props: HTMLProps = {
    role: 'presentation',
    onPointerEnter: handlePointerEnterOrMove,
    onPointerMove: handlePointerEnterOrMove,
    onPointerDown: handleTouchModalityChange,
    onPointerLeave() {
      setHovering(false);
    },
    get style(): JSX.CSSProperties {
      return {
        position: 'relative',
        [ScrollAreaRootCssVars.scrollAreaCornerHeight as string]: `${cornerSize().height}px`,
        [ScrollAreaRootCssVars.scrollAreaCornerWidth as string]: `${cornerSize().width}px`,
      };
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: [props, elementProps],
    stateAttributesMapping: scrollAreaStateAttributesMapping,
  });

  const contextValue = {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleScroll,
    cornerSize,
    setCornerSize,
    thumbSize,
    setThumbSize,
    touchModality,
    rootRef,
    viewportRef,
    scrollbarYRef,
    scrollbarXRef,
    thumbYRef,
    thumbXRef,
    cornerRef,
    scrollingX,
    setScrollingX,
    scrollingY,
    setScrollingY,
    hovering,
    setHovering,
    rootId,
    hiddenState,
    setHiddenState,
    overflowEdges,
    setOverflowEdges,
    viewportState: state,
    overflowEdgeThreshold,
  };

  useStyleDisableScrollbar(csp);

  return (
    <ScrollAreaRootContext.Provider value={contextValue}>
      {element()}
    </ScrollAreaRootContext.Provider>
  );
}

export interface ScrollAreaRootState {
  /** Whether the scroll area is being scrolled. */
  scrolling: boolean;
  /** Whether horizontal overflow is present. */
  hasOverflowX: boolean;
  /** Whether vertical overflow is present. */
  hasOverflowY: boolean;
  /** Whether there is overflow on the inline start side for the horizontal axis. */
  overflowXStart: boolean;
  /** Whether there is overflow on the inline end side for the horizontal axis. */
  overflowXEnd: boolean;
  /** Whether there is overflow on the block start side. */
  overflowYStart: boolean;
  /** Whether there is overflow on the block end side. */
  overflowYEnd: boolean;
  /** Whether the scrollbar corner is hidden. */
  cornerHidden: boolean;
}

export interface ScrollAreaRootProps extends BaseUIComponentProps<'div', ScrollAreaRoot.State> {
  /**
   * The threshold in pixels that must be passed before the overflow edge attributes are applied.
   * Accepts a single number for all edges or an object to configure them individually.
   * @default 0
   */
  overflowEdgeThreshold?:
    | (
        | number
        | Partial<{
            xStart: number;
            xEnd: number;
            yStart: number;
            yEnd: number;
          }>
      )
    | undefined;
}

export namespace ScrollAreaRoot {
  export type State = ScrollAreaRootState;
  export type Props = ScrollAreaRootProps;
}

function normalizeOverflowEdgeThreshold(
  threshold: ScrollAreaRoot.Props['overflowEdgeThreshold'] | undefined,
) {
  if (typeof threshold === 'number') {
    const value = Math.max(0, threshold);
    return {
      xStart: value,
      xEnd: value,
      yStart: value,
      yEnd: value,
    };
  }

  return {
    xStart: Math.max(0, threshold?.xStart || 0),
    xEnd: Math.max(0, threshold?.xEnd || 0),
    yStart: Math.max(0, threshold?.yStart || 0),
    yEnd: Math.max(0, threshold?.yEnd || 0),
  };
}
