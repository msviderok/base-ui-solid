import { getWindow } from '@floating-ui/utils/dom';
import { createEffect, createMemo, createSignal, onCleanup, type Accessor } from 'solid-js';
import { access, type MaybeAccessor } from '../../solid-helpers';
import type { ContextData, ElementProps, FloatingContext, FloatingRootContext } from '../types';
import { contains, getTarget, isMouseLikePointerType } from '../utils';

function createVirtualElement(
  domElement: Element | null | undefined,
  data: {
    axis: 'x' | 'y' | 'both';
    dataRef: ContextData;
    pointerType: string | undefined;
    x: number | null;
    y: number | null;
  },
) {
  let offsetX: number | null = null;
  let offsetY: number | null = null;
  let isAutoUpdateEvent = false;

  return {
    contextElement: domElement || undefined,
    getBoundingClientRect() {
      const domRect = domElement?.getBoundingClientRect() || {
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      };

      const isXAxis = data.axis === 'x' || data.axis === 'both';
      const isYAxis = data.axis === 'y' || data.axis === 'both';
      const canTrackCursorOnAutoUpdate =
        ['mouseenter', 'mousemove'].includes(data.dataRef.openEvent?.type || '') &&
        data.pointerType !== 'touch';

      let width = domRect.width;
      let height = domRect.height;
      let x = domRect.x;
      let y = domRect.y;

      if (offsetX == null && data.x && isXAxis) {
        offsetX = domRect.x - data.x;
      }

      if (offsetY == null && data.y && isYAxis) {
        offsetY = domRect.y - data.y;
      }

      x -= offsetX || 0;
      y -= offsetY || 0;
      width = 0;
      height = 0;

      if (!isAutoUpdateEvent || canTrackCursorOnAutoUpdate) {
        width = data.axis === 'y' ? domRect.width : 0;
        height = data.axis === 'x' ? domRect.height : 0;
        x = isXAxis && data.x != null ? data.x : x;
        y = isYAxis && data.y != null ? data.y : y;
      } else if (isAutoUpdateEvent && !canTrackCursorOnAutoUpdate) {
        height = data.axis === 'x' ? domRect.height : height;
        width = data.axis === 'y' ? domRect.width : width;
      }

      isAutoUpdateEvent = true;

      return {
        width,
        height,
        x,
        y,
        top: y,
        right: x + width,
        bottom: y + height,
        left: x,
      };
    },
  };
}

function isMouseBasedEvent(event: Event | null): event is MouseEvent {
  return event != null && (event as MouseEvent).clientX != null;
}

export interface UseClientPointProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: MaybeAccessor<boolean | undefined>;
  /**
   * Whether to restrict the client point to an axis and use the reference
   * element (if it exists) as the other axis. This can be useful if the
   * floating element is also interactive.
   * @default 'both'
   */
  axis?: MaybeAccessor<('x' | 'y' | 'both') | undefined>;
  // /**
  //  * An explicitly defined `x` client coordinate.
  //  * @default null
  //  */
  // x?: MaybeAccessor<number | null | undefined>;
  // /**
  //  * An explicitly defined `y` client coordinate.
  //  * @default null
  //  */
  // y?: MaybeAccessor<number | null | undefined>;
}

/**
 * Positions the floating element relative to a client point (in the viewport),
 * such as the mouse position. By default, it follows the mouse cursor.
 * @see https://floating-ui.com/docs/useClientPoint
 */
export function useClientPoint(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  props: UseClientPointProps = {},
): Accessor<ElementProps> {
  const context = () => access(contextProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const open = () => store().state.open;
  const floating = () => store().state.floatingElement;
  const domReference = () => store().state.domReferenceElement;
  const dataRef = () => store().context.dataRef;

  const enabled = () => access(props.enabled) ?? true;
  const axis = () => access(props.axis) ?? 'both';

  let initialRef = false;

  const [pointerType, setPointerType] = createSignal<string | undefined>();

  const setReference = (
    newX: number | null,
    newY: number | null,
    referenceElement?: Element | null,
  ) => {
    if (initialRef) {
      return;
    }

    // Prevent setting if the open event was not a mouse-like one
    // (e.g. focus to open, then hover over the reference element).
    // Only apply if the event exists.
    const openEvent = dataRef().openEvent;
    if (openEvent && !isMouseBasedEvent(openEvent as Event | null)) {
      return;
    }

    store().set(
      'positionReference',
      createVirtualElement(referenceElement ?? domReference(), {
        x: newX,
        y: newY,
        axis: axis(),
        dataRef: dataRef(),
        pointerType: pointerType(),
      }),
    );
  };

  const handleReferenceEnterOrMove = (event: MouseEvent) => {
    if (!open()) {
      setReference(event.clientX, event.clientY, event.currentTarget as Element);
    }
  };

  // If the pointer is a mouse-like pointer, we want to continue following the
  // mouse even if the floating element is transitioning out. On touch
  // devices, this is undesirable because the floating element will move to
  // the dismissal touch point.
  const openCheck = () => (isMouseLikePointerType(pointerType()) ? floating() : open());

  function handleMouseMove(event: MouseEvent) {
    const target = getTarget(event) as Element | null;

    const win = getWindow(floating());

    if (!contains(floating(), target)) {
      setReference(event.clientX, event.clientY);
    } else {
      win.removeEventListener('mousemove', handleMouseMove);
    }
  }

  createEffect(() => {
    if (!openCheck() || !enabled()) {
      return;
    }

    const win = getWindow(floating());

    const openEvent = dataRef().openEvent;
    if (!openEvent || isMouseBasedEvent(openEvent)) {
      win.addEventListener('mousemove', handleMouseMove);

      onCleanup(() => {
        win.removeEventListener('mousemove', handleMouseMove);
      });
      return;
    }

    store().set('positionReference', domReference());
  });

  createEffect(() => {
    if (enabled() && !floating()) {
      initialRef = false;
    }
  });

  createEffect(() => {
    if (!enabled() && open()) {
      initialRef = true;
    }
  });

  const reference = createMemo<ElementProps['reference']>(() => {
    function setPointerTypeRef(event: PointerEvent) {
      setPointerType(event.pointerType);
    }

    return {
      onPointerDown: setPointerTypeRef,
      onPointerEnter: setPointerTypeRef,
      onMouseMove: handleReferenceEnterOrMove,
      onMouseEnter: handleReferenceEnterOrMove,
    };
  });

  /**
   * TODO: This is needed to fix the "cleans up window listener when closing or
   * disabling" test but it's probably not the best way to do it
   */
  const floatingProps = createMemo<ElementProps['floating']>(() => {
    return {
      ref: () => {
        onCleanup(() => {
          // @ts-expect-error even though its not in the types this is valid
          context().refs.setFloating(null);
        });
      },
    };
  });

  const returnValue = createMemo<ElementProps>(() => {
    if (!enabled()) {
      return {};
    }

    return { reference: reference(), trigger: reference(), floating: floatingProps() };
  });

  return returnValue;
}
