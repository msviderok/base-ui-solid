import { ownerDocument } from '@base-ui/utils/owner';
import { getAlignment, getSide, getSideAxis, type Rect } from '@floating-ui/utils';
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  type Accessor,
  type JSX,
} from 'solid-js';
import { useDirection } from '../direction-provider/DirectionContext';
import {
  autoUpdate,
  flip,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
  type Accessorify,
  type AutoUpdateOptions,
  type FloatingContext,
  type FloatingRootContext,
  type FloatingTreeStore,
  type Middleware,
  type MiddlewareState,
  type Padding,
  type Side as PhysicalSide,
  type Placement,
  type UseFloatingOptions,
  type VirtualElement,
} from '../floating-ui-solid/index';
import { arrow } from '../floating-ui-solid/middleware/arrow';
import {
  access,
  useRef,
  type MaybeAccessor,
  type MaybeAccessorValue,
  type ReactLikeRef,
} from '../solid-helpers';
import { DEFAULT_SIDES } from './adaptiveOriginMiddleware';
import { hide } from './hideMiddleware';

function getLogicalSide(sideParam: Side, renderedSide: PhysicalSide, isRtl: boolean): Side {
  const isLogicalSideParam = sideParam === 'inline-start' || sideParam === 'inline-end';
  const logicalRight = isRtl ? 'inline-start' : 'inline-end';
  const logicalLeft = isRtl ? 'inline-end' : 'inline-start';
  return (
    {
      top: 'top',
      right: isLogicalSideParam ? logicalRight : 'right',
      bottom: 'bottom',
      left: isLogicalSideParam ? logicalLeft : 'left',
    } satisfies Record<PhysicalSide, Side>
  )[renderedSide];
}

function getOffsetData(state: MiddlewareState, sideParam: Side, isRtl: boolean) {
  const { rects, placement } = state;
  const data = {
    side: getLogicalSide(sideParam, getSide(placement), isRtl),
    align: getAlignment(placement) || 'center',
    anchor: { width: rects.reference.width, height: rects.reference.height },
    positioner: { width: rects.floating.width, height: rects.floating.height },
  } as const;
  return data;
}

export type Side = 'top' | 'bottom' | 'left' | 'right' | 'inline-end' | 'inline-start';
export type Align = 'start' | 'center' | 'end';
export type Boundary = 'clipping-ancestors' | Element | Element[] | Rect;
export type OffsetFunction = (data: {
  side: Side;
  align: Align;
  anchor: { width: number; height: number };
  positioner: { width: number; height: number };
}) => number;

interface SideFlipMode {
  /**
   * How to avoid collisions on the side axis.
   */
  side?: ('flip' | 'none') | undefined;
  /**
   * How to avoid collisions on the align axis.
   */
  align?: ('flip' | 'shift' | 'none') | undefined;
  /**
   * If both sides on the preferred axis do not fit, determines whether to fallback
   * to a side on the perpendicular axis and which logical side to prefer.
   */
  fallbackAxisSide?: ('start' | 'end' | 'none') | undefined;
}

interface SideShiftMode {
  /**
   * How to avoid collisions on the side axis.
   */
  side?: ('shift' | 'none') | undefined;
  /**
   * How to avoid collisions on the align axis.
   */
  align?: ('shift' | 'none') | undefined;
  /**
   * If both sides on the preferred axis do not fit, determines whether to fallback
   * to a side on the perpendicular axis and which logical side to prefer.
   */
  fallbackAxisSide?: ('start' | 'end' | 'none') | undefined;
}

export type CollisionAvoidance = SideFlipMode | SideShiftMode;

/**
 * Provides standardized anchor positioning behavior for floating elements. Wraps Floating UI's
 * `useFloating` hook.
 */

export function useAnchorPositioning(
  params: useAnchorPositioning.Parameters,
): useAnchorPositioning.ReturnValue {
  // Public parameters
  const anchor = createMemo(() => access(params.anchor));
  const positionMethod = () => access(params.positionMethod) ?? 'absolute';
  const sideParam = () => access(params.side) ?? 'bottom';
  const sideOffset = () => access(params.sideOffset) ?? 0;
  const align = () => access(params.align) ?? 'center';
  const alignOffset = () => access(params.alignOffset) ?? 0;
  const collisionBoundary = () => access(params.collisionBoundary);
  const collisionPaddingParam = () => access(params.collisionPadding) ?? 5;
  const sticky = () => access(params.sticky) ?? false;
  const arrowPadding = () => access(params.arrowPadding) ?? 5;
  const disableAnchorTracking = () => access(params.disableAnchorTracking) ?? false;
  // Private parameters
  const keepMounted = () => access(params.keepMounted) ?? false;
  const mounted = () => access(params.mounted);
  const collisionAvoidance = () => access(params.collisionAvoidance);
  const shiftCrossAxis = () => access(params.shiftCrossAxis) ?? false;
  const nodeId = () => access(params.nodeId);
  const adaptiveOrigin = () => access(params.adaptiveOrigin);
  const lazyFlip = () => access(params.lazyFlip) ?? false;

  const [mountSide, setMountSide] = createSignal<PhysicalSide | null>(null);

  createEffect(() => {
    if (!mounted() && mountSide() !== null) {
      setMountSide(null);
    }
  });

  const collisionAvoidanceSide = () => collisionAvoidance().side || 'flip';
  const collisionAvoidanceAlign = () => collisionAvoidance().align || 'flip';
  const collisionAvoidanceFallbackAxisSide = () => collisionAvoidance().fallbackAxisSide || 'end';

  const direction = useDirection();
  const isRtl = () => direction() === 'rtl';

  const side = createMemo(
    () =>
      mountSide() ||
      (
        {
          top: 'top',
          right: 'right',
          bottom: 'bottom',
          left: 'left',
          'inline-end': isRtl() ? 'left' : 'right',
          'inline-start': isRtl() ? 'right' : 'left',
        } satisfies Record<Side, PhysicalSide>
      )[sideParam()],
  );

  const placement = () => (align() === 'center' ? side() : (`${side()}-${align()}` as Placement));

  // Create a bias to the preferred side.
  // On iOS, when the mobile software keyboard opens, the input is exactly centered
  // in the viewport, but this can cause it to flip to the top undesirably.
  const bias = 1;
  const biasTop = () => (sideParam() === 'bottom' ? bias : 0);
  const biasBottom = () => (sideParam() === 'top' ? bias : 0);
  const biasLeft = () => (sideParam() === 'right' ? bias : 0);
  const biasRight = () => (sideParam() === 'left' ? bias : 0);

  const collisionPadding = createMemo(() => {
    let collisionPaddingValue = collisionPaddingParam() as {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };

    if (typeof collisionPaddingValue === 'number') {
      collisionPaddingValue = {
        top: collisionPaddingValue + biasTop(),
        right: collisionPaddingValue + biasRight(),
        bottom: collisionPaddingValue + biasBottom(),
        left: collisionPaddingValue + biasLeft(),
      };
    } else if (collisionPaddingValue) {
      collisionPaddingValue = {
        top: (collisionPaddingValue.top || 0) + biasTop(),
        right: (collisionPaddingValue.right || 0) + biasRight(),
        bottom: (collisionPaddingValue.bottom || 0) + biasBottom(),
        left: (collisionPaddingValue.left || 0) + biasLeft(),
      };
    }

    return collisionPaddingValue;
  });

  const commonCollisionProps = createMemo(() => {
    const boundary = collisionBoundary();
    return {
      boundary: boundary === 'clipping-ancestors' ? 'clippingAncestors' : boundary,
      padding: collisionPaddingParam(),
    } as const;
  });

  const arrowRef = useRef<Element | null | undefined>(null);
  const shiftDisabled = () =>
    collisionAvoidanceAlign() === 'none' && collisionAvoidanceSide() !== 'shift';
  const crossAxisShiftEnabled = () =>
    !shiftDisabled() && (sticky() || shiftCrossAxis() || collisionAvoidanceSide() === 'shift');

  const offsetMiddleware = createMemo<Middleware>(() => {
    const sideOffsetRef = sideOffset();
    const alignOffsetRef = alignOffset();

    return offset((state) => {
      const data = getOffsetData(state, sideParam(), isRtl());

      const sideAxis = typeof sideOffsetRef === 'function' ? sideOffsetRef(data) : sideOffsetRef;
      const alignAxis =
        typeof alignOffsetRef === 'function' ? alignOffsetRef(data) : alignOffsetRef;

      return {
        mainAxis: sideAxis,
        crossAxis: alignAxis,
        alignmentAxis: alignAxis,
      };
    });
  });

  const flipMiddleware = createMemo<Middleware | null>(() => {
    const collisionPaddingValue = collisionPadding();
    return collisionAvoidanceSide() === 'none'
      ? null
      : flip({
          ...commonCollisionProps(),
          // Ensure the popup flips if it's been limited by its --available-height and it resizes.
          // Since the size() padding is smaller than the flip() padding, flip() will take precedence.
          padding: {
            top: collisionPaddingValue.top + bias,
            right: collisionPaddingValue.right + bias,
            bottom: collisionPaddingValue.bottom + bias,
            left: collisionPaddingValue.left + bias,
          },
          mainAxis: !shiftCrossAxis() && collisionAvoidanceSide() === 'flip',
          crossAxis: collisionAvoidanceAlign() === 'flip' ? 'alignment' : false,
          fallbackAxisSideDirection: collisionAvoidanceFallbackAxisSide(),
        });
  });

  const shiftMiddleware = createMemo<Middleware | null>(() => {
    return shiftDisabled()
      ? null
      : shift(
          // eslint-disable-next-line solid/reactivity
          (data) => {
            const html = ownerDocument(data.elements.floating).documentElement;
            return {
              ...commonCollisionProps(),
              // Use the Layout Viewport to avoid shifting around when pinch-zooming
              // for context menus.
              rootBoundary: shiftCrossAxis()
                ? { x: 0, y: 0, width: html.clientWidth, height: html.clientHeight }
                : undefined,
              mainAxis: collisionAvoidanceAlign() !== 'none',
              crossAxis: crossAxisShiftEnabled(),
              limiter:
                sticky() || shiftCrossAxis()
                  ? undefined
                  : limitShift((limitData) => {
                      if (!arrowRef.current) {
                        return {};
                      }
                      const { width, height } = arrowRef.current.getBoundingClientRect();
                      const sideAxis = getSideAxis(getSide(limitData.placement));
                      const arrowSize = sideAxis === 'y' ? width : height;
                      const offsetAmount =
                        sideAxis === 'y'
                          ? collisionPadding().left + collisionPadding().right
                          : collisionPadding().top + collisionPadding().bottom;
                      return {
                        offset: arrowSize / 2 + offsetAmount / 2,
                      };
                    }),
            };
          },
        );
  });

  const sizeMiddleware = createMemo<Middleware>(() => {
    return size({
      ...commonCollisionProps(),
      apply({ elements: { floating }, rects: { reference }, availableWidth, availableHeight }) {
        const floatingStyle = floating.style;
        floatingStyle.setProperty('--available-width', `${availableWidth}px`);
        floatingStyle.setProperty('--available-height', `${availableHeight}px`);
        floatingStyle.setProperty('--anchor-width', `${reference.width}px`);
        floatingStyle.setProperty('--anchor-height', `${reference.height}px`);
      },
    });
  });

  const arrowMiddleware = createMemo<Middleware>(() => {
    return arrow(() => ({
      // `transform-origin` calculations rely on an element existing. If the arrow hasn't been set,
      // we'll create a fake element.
      element: arrowRef.current || document.createElement('div'),
      padding: arrowPadding(),
      offsetParent: 'floating',
    }));
  });

  const transformOriginMiddleware = createMemo<Middleware>(() => {
    return {
      name: 'transformOrigin',
      fn(state) {
        const { elements, middlewareData, placement: renderedPlacement, rects, y } = state;

        const currentRenderedSide = getSide(renderedPlacement);
        const currentRenderedAxis = getSideAxis(currentRenderedSide);
        const arrowX = middlewareData.arrow?.x || 0;
        const arrowY = middlewareData.arrow?.y || 0;
        const arrowWidth = arrowRef.current?.clientWidth || 0;
        const arrowHeight = arrowRef.current?.clientHeight || 0;
        const transformX = arrowX + arrowWidth / 2;
        const transformY = arrowY + arrowHeight / 2;
        const shiftY = Math.abs(middlewareData.shift?.y || 0);
        const halfAnchorHeight = rects.reference.height / 2;
        const sideOffsetResolvedValue = sideOffset();
        const sideOffsetValue =
          typeof sideOffsetResolvedValue === 'function'
            ? sideOffsetResolvedValue(getOffsetData(state, sideParam(), isRtl()))
            : sideOffsetResolvedValue;
        const isOverlappingAnchor = shiftY > sideOffsetValue;

        const adjacentTransformOrigin = {
          top: `${transformX}px calc(100% + ${sideOffsetValue}px)`,
          bottom: `${transformX}px ${-sideOffsetValue}px`,
          left: `calc(100% + ${sideOffsetValue}px) ${transformY}px`,
          right: `${-sideOffsetValue}px ${transformY}px`,
        }[currentRenderedSide];
        const overlapTransformOrigin = `${transformX}px ${rects.reference.y + halfAnchorHeight - y}px`;

        elements.floating.style.setProperty(
          '--transform-origin',
          crossAxisShiftEnabled() && currentRenderedAxis === 'y' && isOverlappingAnchor
            ? overlapTransformOrigin
            : adjacentTransformOrigin,
        );

        return {};
      },
    };
  });

  const middleware = createMemo(() => {
    const middlewareArray: MaybeAccessorValue<UseFloatingOptions['middleware']> = [
      offsetMiddleware(),
    ];

    // https://floating-ui.com/docs/flip#combining-with-shift
    if (
      collisionAvoidanceSide() === 'shift' ||
      collisionAvoidanceAlign() === 'shift' ||
      align() === 'center'
    ) {
      middlewareArray.push(shiftMiddleware(), flipMiddleware());
    } else {
      middlewareArray.push(flipMiddleware(), shiftMiddleware());
    }

    middlewareArray.push(
      sizeMiddleware(),
      arrowMiddleware(),
      transformOriginMiddleware(),
      hide,
      adaptiveOrigin(),
    );

    return middlewareArray;
  });

  // TODO v1: figure out if this is needed
  // useIsoLayoutEffect(() => {
  //   // Ensure positioning doesn't run initially for `keepMounted` elements that
  //   // aren't initially open.
  //   if (!mounted && floatingRootContext) {
  //     floatingRootContext.update({
  //       referenceElement: null,
  //       floatingElement: null,
  //       domReferenceElement: null,
  //     });
  //   }
  // }, [mounted, floatingRootContext]);

  const autoUpdateOptions = createMemo<AutoUpdateOptions>(() => ({
    elementResize: !disableAnchorTracking() && typeof ResizeObserver !== 'undefined',
    layoutShift: !disableAnchorTracking() && typeof IntersectionObserver !== 'undefined',
  }));

  const {
    refs,
    elements,
    x,
    y,
    middlewareData,
    update,
    placement: renderedPlacement,
    context,
    isPositioned,
    floatingStyles: originalFloatingStyles,
  } = useFloating({
    get rootContext() {
      return params.floatingRootContext;
    },
    get placement() {
      return placement();
    },
    get middleware() {
      return middleware();
    },
    get strategy() {
      return positionMethod();
    },
    get whileElementsMounted(): UseFloatingOptions['whileElementsMounted'] {
      if (keepMounted()) {
        return undefined;
      }

      return (...args) => untrack(() => autoUpdate(...args, autoUpdateOptions()));
    },
    get nodeId() {
      return nodeId();
    },
    get externalTree() {
      return params.externalTree;
    },
  });

  // Default to `fixed` when not positioned to prevent `autoFocus` scroll jumps.
  // This ensures the popup is inside the viewport initially before it gets positioned.
  const resolvedPosition = createMemo<'absolute' | 'fixed'>(() =>
    isPositioned() ? positionMethod() : 'fixed',
  );

  const floatingStyles = createMemo<JSX.CSSProperties>(() => {
    const { sideX, sideY } = middlewareData().adaptiveOrigin || DEFAULT_SIDES;
    const base = adaptiveOrigin()
      ? { position: resolvedPosition(), [sideX]: `${x()}px`, [sideY]: `${y()}px` }
      : { position: resolvedPosition(), ...originalFloatingStyles() };
    if (!isPositioned()) {
      base.opacity = 0;
    }
    return base;
  });

  let registeredPositionReferenceRef: Element | VirtualElement | null = null;

  createEffect(() => {
    if (!mounted()) {
      return;
    }

    const anchorValue = anchor();
    const resolvedAnchor = typeof anchorValue === 'function' ? anchorValue() : anchorValue;
    const finalAnchor = resolvedAnchor || null;

    if (finalAnchor !== registeredPositionReferenceRef) {
      refs.setPositionReference(finalAnchor);
      registeredPositionReferenceRef = finalAnchor;
    }
  });

  createEffect(() => {
    if (!mounted()) {
      return;
    }

    // Refs from parent components are set after useLayoutEffect runs and are available in useEffect.
    // Therefore, if the anchor is a ref, we need to update the position reference in useEffect.
    const resolvedAnchor = access(anchor);
    if (typeof resolvedAnchor === 'function') {
      return;
    }

    if (resolvedAnchor !== registeredPositionReferenceRef) {
      refs.setPositionReference(resolvedAnchor || null);
      registeredPositionReferenceRef = resolvedAnchor || null;
    }
  });

  createEffect(() => {
    const domReference = elements.domReference();
    const floating = elements.floating();
    if (keepMounted() && mounted() && domReference && floating) {
      const cleanup = autoUpdate(domReference, floating, update, autoUpdateOptions());
      onCleanup(cleanup);
    }
  });

  const renderedSide = () => getSide(renderedPlacement());
  const logicalRenderedSide = () => getLogicalSide(sideParam(), renderedSide(), isRtl());
  const renderedAlign = () => getAlignment(renderedPlacement()) || 'center';
  const anchorHidden = () => Boolean(middlewareData().hide?.referenceHidden);

  /**
   * Locks the flip (makes it "sticky") so it doesn't prefer a given placement
   * and flips back lazily, not eagerly. Ideal for filtered lists that change
   * the size of the popup dynamically to avoid unwanted flipping when typing.
   */
  createEffect(() => {
    if (lazyFlip() && mounted() && isPositioned()) {
      setMountSide(renderedSide());
    }
  });

  const arrowStyles = createMemo<JSX.CSSProperties>(() => ({
    position: 'absolute',
    top:
      middlewareData().arrow?.y === undefined ? undefined : `${middlewareData().arrow?.y || 0}px`,
    left:
      middlewareData().arrow?.x === undefined ? undefined : `${middlewareData().arrow?.x || 0}px`,
  }));

  const arrowUncentered = () => middlewareData().arrow?.centerOffset !== 0;

  return {
    positionerStyles: floatingStyles,
    arrowStyles,
    arrowUncentered,
    side: logicalRenderedSide,
    align: renderedAlign,
    physicalSide: renderedSide,
    anchorHidden,
    arrowRef,
    context,
    isPositioned,
    update,
  };
}

export interface UseAnchorPositioningSharedParameters {
  /**
   * An element to position the popup against.
   * By default, the popup will be positioned against the trigger.
   */
  anchor?: (Element | null | VirtualElement | (() => Element | VirtualElement | null)) | undefined;
  /**
   * Determines which CSS `position` property to use.
   * @default 'absolute'
   */
  positionMethod?: ('absolute' | 'fixed') | undefined;
  /**
   * Which side of the anchor element to align the popup against.
   * May automatically change to avoid collisions.
   * @default 'bottom'
   */
  side?: Side | undefined;
  /**
   * Distance between the anchor and the popup in pixels.
   * Also accepts a function that returns the distance to read the dimensions of the anchor
   * and positioner elements, along with its side and alignment.
   *
   * The function takes a `data` object parameter with the following properties:
   * - `data.anchor`: the dimensions of the anchor element with properties `width` and `height`.
   * - `data.positioner`: the dimensions of the positioner element with properties `width` and `height`.
   * - `data.side`: which side of the anchor element the positioner is aligned against.
   * - `data.align`: how the positioner is aligned relative to the specified side.
   *
   * @example
   * ```jsx
   * <Positioner
   *   sideOffset={({ side, align, anchor, positioner }) => {
   *     return side === 'top' || side === 'bottom'
   *       ? anchor.height
   *       : anchor.width;
   *   }}
   * />
   * ```
   *
   * @default 0
   */
  sideOffset?: (number | OffsetFunction) | undefined;
  /**
   * How to align the popup relative to the specified side.
   * @default 'center'
   */
  align?: Align | undefined;
  /**
   * Additional offset along the alignment axis in pixels.
   * Also accepts a function that returns the offset to read the dimensions of the anchor
   * and positioner elements, along with its side and alignment.
   *
   * The function takes a `data` object parameter with the following properties:
   * - `data.anchor`: the dimensions of the anchor element with properties `width` and `height`.
   * - `data.positioner`: the dimensions of the positioner element with properties `width` and `height`.
   * - `data.side`: which side of the anchor element the positioner is aligned against.
   * - `data.align`: how the positioner is aligned relative to the specified side.
   *
   * @example
   * ```jsx
   * <Positioner
   *   alignOffset={({ side, align, anchor, positioner }) => {
   *     return side === 'top' || side === 'bottom'
   *       ? anchor.width
   *       : anchor.height;
   *   }}
   * />
   * ```
   *
   * @default 0
   */
  alignOffset?: (number | OffsetFunction) | undefined;
  /**
   * An element or a rectangle that delimits the area that the popup is confined to.
   * @default 'clipping-ancestors'
   */
  collisionBoundary?: Boundary | undefined;
  /**
   * Additional space to maintain from the edge of the collision boundary.
   * @default 5
   */
  collisionPadding?: Padding | undefined;
  /**
   * Whether to maintain the popup in the viewport after
   * the anchor element was scrolled out of view.
   * @default false
   */
  sticky?: boolean | undefined;
  /**
   * Minimum distance to maintain between the arrow and the edges of the popup.
   *
   * Use it to prevent the arrow element from hanging out of the rounded corners of a popup.
   * @default 5
   */
  arrowPadding?: number | undefined;
  /**
   *Whether to disable the popup from tracking any layout shift of its positioning anchor.
   * @default false
   */
  disableAnchorTracking?: boolean | undefined;
  /**
   * Determines how to handle collisions when positioning the popup.
   *
   * @example
   * ```jsx
   * <Positioner
   *   collisionAvoidance={{
   *     side: 'shift',
   *     align: 'shift',
   *     fallbackAxisSide: 'none',
   *   }}
   * />
   * ```
   *
   */
  collisionAvoidance?: CollisionAvoidance | undefined;
}

export interface UseAnchorPositioningParameters extends Accessorify<
  useAnchorPositioning.SharedParameters,
  'maybeAccessor'
> {
  keepMounted?: MaybeAccessor<boolean | undefined>;
  trackCursorAxis?: MaybeAccessor<('none' | 'x' | 'y' | 'both') | undefined>;
  floatingRootContext?: FloatingRootContext | undefined;
  mounted: MaybeAccessor<boolean>;
  disableAnchorTracking: MaybeAccessor<boolean>;
  nodeId?: MaybeAccessor<string | undefined>;
  adaptiveOrigin?: MaybeAccessor<Middleware | undefined>;
  collisionAvoidance: MaybeAccessor<CollisionAvoidance>;
  shiftCrossAxis?: MaybeAccessor<boolean | undefined>;
  lazyFlip?: MaybeAccessor<boolean | undefined>;
  externalTree?: FloatingTreeStore | undefined;
}

export interface UseAnchorPositioningReturnValue {
  positionerStyles: Accessor<JSX.CSSProperties>;
  arrowStyles: Accessor<JSX.CSSProperties>;
  arrowUncentered: Accessor<boolean>;
  side: Accessor<Side>;
  align: Accessor<Align>;
  physicalSide: Accessor<PhysicalSide>;
  anchorHidden: Accessor<boolean>;
  arrowRef: ReactLikeRef<Element | null | undefined>;
  context: FloatingContext;
  isPositioned: Accessor<boolean>;
  update: () => void;
}

export namespace useAnchorPositioning {
  export type SharedParameters = UseAnchorPositioningSharedParameters;
  export type Parameters = UseAnchorPositioningParameters;
  export type ReturnValue = UseAnchorPositioningReturnValue;
}
