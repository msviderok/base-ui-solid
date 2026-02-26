import { computePosition } from '@floating-ui/dom';
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  type Accessor,
  type JSX,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { access, defaultProps } from '../../solid-helpers';
import type {
  ComputePositionConfig,
  ComputePositionReturn,
  Prettify,
  ReferenceType,
  UseFloatingOptions,
} from '../types';

export type UsePositionData = ComputePositionReturn & { isPositioned: boolean };

export type UsePositionOptions<RT extends ReferenceType = ReferenceType> = Prettify<
  Partial<ComputePositionConfig> & {
    /**
     * A callback invoked when both the reference and floating elements are
     * mounted, and cleaned up when either is unmounted. This is useful for
     * setting up event listeners (e.g. pass `autoUpdate`).
     */
    whileElementsMounted?: (reference: RT, floating: HTMLElement, update: () => void) => () => void;

    /**
     * Object containing the reference and floating elements.
     */
    elements?: {
      reference?: RT | null | undefined;
      floating?: HTMLElement | null | undefined;
    };
    /**
     * The `open` state of the floating element to synchronize with the
     * `isPositioned` value.
     * @default false
     */
    open?: boolean | undefined;
    /**
     * Whether to use `transform` for positioning instead of `top` and `left`
     * (layout) in the `floatingStyles` object.
     * @default true
     */
    transform?: boolean | undefined;
  }
>;

export interface UsePositionFloatingSharedReturn extends UsePositionData {
  /**
   * Update the position of the floating element, re-rendering the component
   * if required.
   */
  update: () => void;
  /**
   * Pre-configured positioning styles to apply to the floating element.
   */
  floatingStyles: JSX.CSSProperties;
}

export type UsePositionFloatingReturn<RT extends ReferenceType = ReferenceType> = Prettify<
  UsePositionFloatingSharedReturn & {
    refs: {
      /**
       * A Solid ref to the reference element.
       */
      reference: Accessor<RT | null | undefined>;
      /**
       * A Solid ref to the floating element.
       */
      floating: Accessor<HTMLElement | null | undefined>;
      /**
       * A callback to set the reference element (reactive).
       */
      setReference: (value: RT | null | undefined) => void;
      /**
       * A callback to set the floating element (reactive).
       */
      setFloating: (value: HTMLElement | null | undefined) => void;
    };
    /**
     * Object containing the reference and floating elements.
     */
    elements: {
      reference: Accessor<RT | null | undefined>;
      floating: Accessor<HTMLElement | null | undefined>;
    };
  }
>;

/**
 * @internal
 * This is a Solid port of the React useFloating hook
 * https://github.com/floating-ui/floating-ui/blob/3286d01bc1425150ad5aaa22aee062fe70fa8f5c/packages/react-dom/src/useFloating.ts
 */
export function useFloatingOriginal<RT extends ReferenceType = ReferenceType>(
  options: UseFloatingOptions = {},
): UsePositionFloatingReturn<RT> {
  const props = defaultProps(options, {
    placement: 'bottom',
    strategy: 'absolute',
    middleware: [],
    transform: true,
  });

  const [data, setData] = createStore<UsePositionData>({
    x: 0,
    y: 0,
    strategy: access(props.strategy),
    placement: access(props.placement),
    middlewareData: {},
    isPositioned: false,
  });

  const [reference, setReference] = createSignal<RT | null | undefined>(null);
  const [floating, setFloating] = createSignal<HTMLElement | null | undefined>(null);

  const referenceEl = createMemo(
    () => (props.elements?.reference as RT | null | undefined) ?? reference(),
  );
  const floatingEl = createMemo(() => props.elements?.floating ?? floating());

  let isMountedRef = false;

  function update() {
    const r = referenceEl();
    const f = floatingEl();
    if (!r || !f) {
      return;
    }

    const config: ComputePositionConfig = {
      placement: props.placement,
      strategy: props.strategy,
      middleware: props.middleware,
    };

    const platform = options.platform;
    if (platform) {
      config.platform = platform;
    }

    computePosition(r, f, config).then((computedData) => {
      if (isMountedRef) {
        setData(
          reconcile({
            ...computedData,
            // The floating element's position may be recomputed while it's closed
            // but still mounted (such as when transitioning out). To ensure
            // `isPositioned` will be `false` initially on the next open, avoid
            // setting it to `true` when `open === false` (must be specified).
            isPositioned: options.open !== false,
          }),
        );
      }
    });
  }

  createEffect(() => {
    if (options.open === false && data.isPositioned) {
      setData('isPositioned', false);
    }
  });

  onMount(() => {
    isMountedRef = true;

    onCleanup(() => {
      isMountedRef = false;
    });
  });

  createEffect(
    on([referenceEl, floatingEl, () => props.whileElementsMounted, () => options.open], () => {
      const r = referenceEl();
      const f = floatingEl();
      if (r && f) {
        if (props.whileElementsMounted) {
          const cleanup = props.whileElementsMounted(r, f, update);
          onCleanup(cleanup);
          return;
        }

        update();
      }
    }),
  );

  const refs = {
    reference,
    floating,
    setReference,
    setFloating,
  };

  const elements = { reference: referenceEl, floating: floatingEl };

  const floatingStyles = createMemo<JSX.CSSProperties>(() => {
    const initialStyles: JSX.CSSProperties = {
      position: props.strategy,
      left: 0,
      top: 0,
    };

    const el = elements.floating();
    if (!el) {
      return initialStyles;
    }

    const x = roundByDPR(el, data.x);
    const y = roundByDPR(el, data.y);

    if (props.transform) {
      return {
        ...initialStyles,
        transform: `translate(${x}px, ${y}px)`,
        ...(getDPR(el) >= 1.5 && { willChange: 'transform' }),
      };
    }

    return {
      position: props.strategy,
      left: `${x}px`,
      top: `${y}px`,
    };
  });

  return {
    update,
    refs,
    elements,
    get floatingStyles() {
      return floatingStyles();
    },
    get isPositioned() {
      return data.isPositioned;
    },
    get placement() {
      return data.placement;
    },
    get strategy() {
      return data.strategy;
    },
    get middlewareData() {
      return data.middlewareData;
    },
    get x() {
      return data.x;
    },
    get y() {
      return data.y;
    },
  };
}

/**
 * This is a Solid port of the React roundByDPR function
 * https://github.com/floating-ui/floating-ui/blob/3286d01bc1425150ad5aaa22aee062fe70fa8f5c/packages/react-dom/src/utils/roundByDPR.ts
 */
function roundByDPR(element: Element, value: number) {
  const dpr = getDPR(element);
  return Math.round(value * dpr) / dpr;
}

/**
 * This is a Solid port of the React getDPR function
 * https://github.com/floating-ui/floating-ui/blob/3286d01bc1425150ad5aaa22aee062fe70fa8f5c/packages/react-dom/src/utils/getDPR.ts
 */
function getDPR(element: Element): number {
  if (typeof window === 'undefined') {
    return 1;
  }
  const win = element.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}
