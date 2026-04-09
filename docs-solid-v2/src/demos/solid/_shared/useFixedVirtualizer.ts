import { createMemo, createSignal, onCleanup, type Accessor } from 'solid-js';

export interface FixedVirtualizerHandle {
  options: {
    count: number;
  };
  measure(): void;
  scrollToIndex(index: number, options?: { align?: 'start' | 'end' }): void;
}

interface FixedVirtualizerOptions {
  itemHeight?: number;
  overscan?: number;
  paddingStart?: number;
  paddingEnd?: number;
  initialViewportHeight?: number;
}

export function createFixedVirtualizer<T>(
  items: Accessor<T[]>,
  options: FixedVirtualizerOptions = {},
) {
  const itemHeight = options.itemHeight ?? 32;
  const overscan = options.overscan ?? 20;
  const paddingStart = options.paddingStart ?? 8;
  const paddingEnd = options.paddingEnd ?? 8;

  const [scrollTop, setScrollTop] = createSignal(0);
  const [viewportHeight, setViewportHeight] = createSignal(options.initialViewportHeight ?? 352);

  let scrollElement: HTMLDivElement | null = null;
  let resizeObserver: ResizeObserver | null = null;

  function updateViewportHeight() {
    if (scrollElement) {
      setViewportHeight(scrollElement.clientHeight);
    }
  }

  function setScrollElement(element: HTMLDivElement | null) {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    scrollElement = element;

    if (!element) {
      return;
    }

    setViewportHeight(element.clientHeight);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        setViewportHeight(element.clientHeight);
      });
      resizeObserver.observe(element);
    }
  }

  onCleanup(() => {
    resizeObserver?.disconnect();
  });

  const totalSize = createMemo(() => items().length * itemHeight + paddingStart + paddingEnd);

  const visibleRange = createMemo(() => {
    const count = items().length;

    if (count === 0) {
      return { start: 0, end: 0 };
    }

    const start = Math.max(0, Math.floor(scrollTop() / itemHeight) - overscan);
    const end = Math.min(
      count,
      Math.ceil((scrollTop() + viewportHeight()) / itemHeight) + overscan,
    );

    return { start, end };
  });

  const visibleIndexes = createMemo(() => {
    const { start, end } = visibleRange();
    return Array.from({ length: Math.max(0, end - start) }, (_, offset) => start + offset);
  });

  function handleScroll(event: Event) {
    setScrollTop((event.currentTarget as HTMLDivElement).scrollTop);
  }

  const virtualizer: FixedVirtualizerHandle = {
    get options() {
      return {
        count: items().length,
      };
    },
    measure: updateViewportHeight,
    scrollToIndex(index, options) {
      if (!scrollElement) {
        return;
      }

      const top = paddingStart + index * itemHeight;
      const bottom = top + itemHeight;
      const currentTop = scrollElement.scrollTop;
      const currentBottom = currentTop + viewportHeight();
      let nextTop = currentTop;

      if (options?.align === 'start') {
        nextTop = top - paddingStart;
      } else if (options?.align === 'end') {
        nextTop = bottom - viewportHeight() + paddingEnd;
      } else if (top < currentTop + paddingStart) {
        nextTop = top - paddingStart;
      } else if (bottom > currentBottom - paddingEnd) {
        nextTop = bottom - viewportHeight() + paddingEnd;
      }

      const maxTop = Math.max(0, totalSize() - viewportHeight());
      const clampedTop = Math.max(0, Math.min(nextTop, maxTop));

      scrollElement.scrollTop = clampedTop;
      setScrollTop(clampedTop);
    },
  };

  return {
    handleScroll,
    paddingStart,
    itemHeight,
    totalSize,
    visibleIndexes,
    virtualizer,
    setScrollElement,
  };
}
