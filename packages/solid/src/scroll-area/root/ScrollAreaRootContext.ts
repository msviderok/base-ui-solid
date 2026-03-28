import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import type { ReactLikeRef } from '../../solid-helpers';
import type { Coords, HiddenState, OverflowEdges, ScrollAreaRoot, Size } from './ScrollAreaRoot';

export interface ScrollAreaRootContext {
  cornerSize: Accessor<Size>;
  setCornerSize: Setter<Size>;
  thumbSize: Accessor<Size>;
  setThumbSize: Setter<Size>;
  touchModality: Accessor<boolean>;
  hovering: Accessor<boolean>;
  setHovering: Setter<boolean>;
  scrollingX: Accessor<boolean>;
  setScrollingX: Setter<boolean>;
  scrollingY: Accessor<boolean>;
  setScrollingY: Setter<boolean>;
  rootRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  viewportRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  scrollbarYRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  scrollbarXRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  thumbYRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  thumbXRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  cornerRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
  handleScroll: (scrollPosition: Coords) => void;
  rootId: Accessor<string | undefined>;
  hiddenState: Accessor<HiddenState>;
  setHiddenState: Setter<HiddenState>;
  overflowEdges: Accessor<OverflowEdges>;
  setOverflowEdges: Setter<OverflowEdges>;
  viewportState: ScrollAreaRoot.State;
  overflowEdgeThreshold: Accessor<{
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
  }>;
}

export const ScrollAreaRootContext = createContext<ScrollAreaRootContext>();

export function useScrollAreaRootContext() {
  const context = useContext(ScrollAreaRootContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: ScrollAreaRootContext is missing. ScrollArea parts must be placed within <ScrollArea.Root>.',
    );
  }
  return context;
}
