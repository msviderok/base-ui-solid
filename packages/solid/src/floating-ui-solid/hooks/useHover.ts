import { isElement } from '@floating-ui/utils/dom';
import {
  createEffect,
  createMemo,
  on,
  onCleanup,
  mergeProps as solidMergeProps,
  type Accessor,
} from 'solid-js';
import type { MaybeAccessor } from '../../solid-helpers';
import { access } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { FloatingUIOpenChangeDetails } from '../../utils/types';
import { useTimeout } from '../../utils/useTimeout';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import { FloatingTreeStore } from '../components/FloatingTreeStore';
import type {
  Delay,
  ElementProps,
  FloatingContext,
  FloatingRootContext,
  FloatingTreeType,
  SafePolygonOptions,
} from '../types';
import { contains, getDocument, getTarget, isMouseLikePointerType } from '../utils';
import { TYPEABLE_SELECTOR } from '../utils/constants';
import { createAttribute } from '../utils/createAttribute';

const safePolygonIdentifier = createAttribute('safe-polygon');
const interactiveSelector = `button,[role="button"],select,[tabindex]:not([tabindex="-1"]),${TYPEABLE_SELECTOR}`;

function isInteractiveElement(element: Element | null | undefined) {
  return element ? Boolean(element.closest(interactiveSelector)) : false;
}

export interface HandleCloseContext extends FloatingContext {
  onClose: () => void;
  tree?: FloatingTreeType | null;
  leave?: boolean;
}

export interface HandleClose {
  (context: HandleCloseContext): (event: MouseEvent) => void;
  __options?: SafePolygonOptions;
}

export function getDelay(
  value: UseHoverProps['delay'],
  prop: 'open' | 'close',
  pointerType?: PointerEvent['pointerType'],
) {
  if (pointerType && !isMouseLikePointerType(pointerType)) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'function') {
    const result = value();
    if (typeof result === 'number') {
      return result;
    }
    return result?.[prop];
  }

  return value?.[prop];
}

export interface UseHoverProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: MaybeAccessor<boolean | undefined>;
  /**
   * Accepts an event handler that runs on `mousemove` to control when the
   * floating element closes once the cursor leaves the reference element.
   * @default null
   */
  handleClose?: HandleClose | null;
  /**
   * Waits until the user’s cursor is at “rest” over the reference element
   * before changing the `open` state.
   * @default 0
   */
  restMs?: MaybeAccessor<number | undefined>;
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  delay?: MaybeAccessor<Delay | undefined>;
  /**
   * Whether the logic only runs for mouse input, ignoring touch input.
   * Note: due to a bug with Linux Chrome, "pen" inputs are considered "mouse".
   * @default false
   */
  mouseOnly?: MaybeAccessor<boolean | undefined>;
  /**
   * Whether moving the cursor over the floating element will open it, without a
   * regular hover event required.
   * @default true
   */
  move?: MaybeAccessor<boolean | undefined>;
  /**
   * Allows to override the element that will trigger the popup.
   * When it's set, useHover won't read the reference element from the root context.
   * This allows to have multiple triggers per floating element (assuming `useHover` is called per trigger).
   */
  triggerElement?: MaybeAccessor<HTMLElement | null | undefined>;
  /**
   * External FlatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore;
}

/**
 * Opens the floating element while hovering over the reference element, like
 * CSS `:hover`.
 * @see https://floating-ui.com/docs/useHover
 */
export function useHover(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  props: UseHoverProps = {},
): Accessor<ElementProps> {
  const context = () => access(contextProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const open = () => store().useState('open')();
  const floatingElement = () => store().useState('floatingElement')();
  const domReferenceElement = () => store().useState('domReferenceElement')();
  const dataRef = () => store().context.dataRef;
  const events = () => store().context.events;
  const enabled = () => access(props.enabled) ?? true;
  const delay = () => access(props.delay) ?? 0;
  const mouseOnly = () => access(props.mouseOnly) ?? false;
  const restMs = () => access(props.restMs) ?? 0;
  const move = () => access(props.move) ?? true;
  const triggerElement = () => access(props.triggerElement) ?? null;

  const tree = useFloatingTree(props.externalTree);
  const parentId = useFloatingParentNodeId();

  let pointerTypeRef: string | undefined;
  let interactedInsideRef = false;
  const timeout = useTimeout();
  const restTimeout = useTimeout();
  let blockMouseMoveRef = true;
  let performedPointerEventsMutationRef = false;
  let restTimeoutPendingRef = false;
  let unbindMouseMoveRef = () => {};

  const isHoverOpen = () => {
    const type = dataRef().openEvent?.type;
    return type?.includes('mouse') && type !== 'mousedown';
  };

  const isClickLikeOpenEvent = () => {
    if (interactedInsideRef) {
      return true;
    }

    const openEvent = dataRef().openEvent;
    return openEvent ? ['click', 'mousedown'].includes(openEvent.type) : false;
  };

  function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
    if (!details.open) {
      timeout.clear();
      restTimeout.clear();
      blockMouseMoveRef = true;
      restTimeoutPendingRef = false;
    }
  }

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  createEffect(() => {
    if (!enabled()) {
      return;
    }

    events().on('openchange', onOpenChangeLocal);
    onCleanup(() => {
      events().off('openchange', onOpenChangeLocal);
    });
  });

  function onLeave(event: MouseEvent) {
    if (isClickLikeOpenEvent()) {
      return;
    }

    if (isHoverOpen()) {
      store().setOpen(
        false,
        createChangeEventDetails(
          REASONS.triggerHover,
          event,
          (event.currentTarget as HTMLElement) ?? undefined,
        ),
      );
    }
  }

  createEffect(() => {
    if (!enabled()) {
      return;
    }
    if (!props.handleClose) {
      return;
    }
    if (!open()) {
      return;
    }

    const floating = floatingElement();
    const html = getDocument(floating).documentElement;
    html.addEventListener('mouseleave', onLeave);
    onCleanup(() => html.removeEventListener('mouseleave', onLeave));
  });

  const closeWithDelay = (event: MouseEvent, runElseBranch = true) => {
    const closeDelay = getDelay(delay(), 'close', pointerTypeRef);
    if (closeDelay) {
      timeout.start(closeDelay, () =>
        store().setOpen(false, createChangeEventDetails(REASONS.triggerHover, event)),
      );
    } else if (runElseBranch) {
      timeout.clear();
      store().setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
    }
  };

  const cleanupMouseMoveHandler = () => {
    unbindMouseMoveRef();
  };

  const clearPointerEvents = () => {
    if (performedPointerEventsMutationRef) {
      const floating = floatingElement();
      const body = getDocument(floating).body;
      body.style.pointerEvents = '';
      body.removeAttribute(safePolygonIdentifier);
      performedPointerEventsMutationRef = false;
    }
  };

  const handleInteractInside = (event: PointerEvent) => {
    const target = getTarget(event) as Element | null;
    if (!isInteractiveElement(target)) {
      interactedInsideRef = false;
      return;
    }

    interactedInsideRef = true;
  };

  function onReferenceMouseEnter(event: MouseEvent) {
    timeout.clear();
    blockMouseMoveRef = false;

    if (
      (mouseOnly() && !isMouseLikePointerType(pointerTypeRef)) ||
      (restMs() > 0 && !getDelay(delay(), 'open'))
    ) {
      return;
    }

    const openDelay = getDelay(delay(), 'open', pointerTypeRef);
    const trigger = (event.currentTarget as HTMLElement) ?? undefined;

    const domReference = store().select('domReferenceElement');

    const isOverInactiveTrigger = domReference && trigger && !contains(domReference, trigger);

    if (openDelay) {
      timeout.start(openDelay, () => {
        if (!store().select('open')) {
          store().setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, trigger));
        }
      });
    } else if (!open() || isOverInactiveTrigger) {
      store().setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, trigger));
    }
  }

  function onReferenceMouseLeave(event: MouseEvent) {
    if (isClickLikeOpenEvent()) {
      clearPointerEvents();
      return;
    }

    unbindMouseMoveRef();

    const floating = floatingElement();
    const doc = getDocument(floating);
    restTimeout.clear();
    restTimeoutPendingRef = false;

    const triggers = store().context.triggerElements;

    if (event.relatedTarget && triggers.hasElement(event.relatedTarget as Element)) {
      // If the mouse is leaving the reference element to another trigger, don't explicitly close the popup
      // as it will be moved.
      return;
    }

    const ctx = dataRef().floatingContext;
    if (props.handleClose && ctx) {
      // Prevent clearing `onScrollMouseLeave` timeout.
      if (!open()) {
        timeout.clear();
      }

      const mergedProps = solidMergeProps(ctx, {
        tree,
        x: () => event.clientX,
        y: () => event.clientY,
        onClose() {
          clearPointerEvents();
          cleanupMouseMoveHandler();
          if (!isClickLikeOpenEvent()) {
            closeWithDelay(event, true);
          }
        },
      });
      const handler = props.handleClose(mergedProps);

      doc.addEventListener('mousemove', handler);
      unbindMouseMoveRef = () => {
        doc.removeEventListener('mousemove', handler);
      };

      return;
    }

    // Allow interactivity without `safePolygon` on touch devices. With a
    // pointer, a short close delay is an alternative, so it should work
    // consistently.
    const shouldClose =
      pointerTypeRef === 'touch'
        ? !contains(floatingElement(), event.relatedTarget as Element | null)
        : true;
    if (shouldClose) {
      closeWithDelay(event);
    }
  }

  // Ensure the floating element closes after scrolling even if the pointer
  // did not move.
  // https://github.com/floating-ui/floating-ui/discussions/1692
  function onScrollMouseLeave(event: MouseEvent) {
    const ctx = dataRef().floatingContext;
    if (isClickLikeOpenEvent() || !ctx || !store().select('open')) {
      return;
    }

    const triggers = store().context.triggerElements;

    if (event.relatedTarget && triggers.hasElement(event.relatedTarget as Element)) {
      // If the mouse is leaving the reference element to another trigger, don't explicitly close the popup
      // as it will be moved.
      return;
    }

    const mergedProps = solidMergeProps(ctx, {
      tree,
      x: () => event.clientX,
      y: () => event.clientY,
      onClose() {
        clearPointerEvents();
        cleanupMouseMoveHandler();
        if (!isClickLikeOpenEvent()) {
          closeWithDelay(event);
        }
      },
    });
    props.handleClose?.(mergedProps)(event);
  }

  function onFloatingMouseEnter() {
    timeout.clear();
    clearPointerEvents();
  }

  function onFloatingMouseLeave(event: MouseEvent) {
    if (!isClickLikeOpenEvent()) {
      closeWithDelay(event, false);
    }
  }

  // Registering the mouse events on the reference directly to bypass React's
  // delegation system. If the cursor was on a disabled element and then entered
  // the reference (no gap), `mouseenter` doesn't fire in the delegation system.
  createEffect(() => {
    if (!enabled()) {
      return;
    }

    const trigger = (triggerElement() ?? domReferenceElement()) as HTMLElement | null;
    if (isElement(trigger)) {
      const floating = floatingElement();

      if (open()) {
        trigger.addEventListener('mouseleave', onScrollMouseLeave);
      }

      if (move()) {
        trigger.addEventListener('mousemove', onReferenceMouseEnter, {
          once: true,
        });
      }

      trigger.addEventListener('mouseenter', onReferenceMouseEnter);
      trigger.addEventListener('mouseleave', onReferenceMouseLeave);

      if (floating) {
        floating.addEventListener('mouseleave', onScrollMouseLeave);
        floating.addEventListener('mouseenter', onFloatingMouseEnter);
        floating.addEventListener('mouseleave', onFloatingMouseLeave);
        floating.addEventListener('pointerdown', handleInteractInside, true);
      }

      onCleanup(() => {
        if (open()) {
          trigger.removeEventListener('mouseleave', onScrollMouseLeave);
        }

        if (move()) {
          trigger.removeEventListener('mousemove', onReferenceMouseEnter);
        }

        trigger.removeEventListener('mouseenter', onReferenceMouseEnter);
        trigger.removeEventListener('mouseleave', onReferenceMouseLeave);

        if (floating) {
          floating.removeEventListener('mouseleave', onScrollMouseLeave);
          floating.removeEventListener('mouseenter', onFloatingMouseEnter);
          floating.removeEventListener('mouseleave', onFloatingMouseLeave);
          floating.removeEventListener('pointerdown', handleInteractInside, true);
        }
      });
    }
  });

  // Block pointer-events of every element other than the reference and floating
  // while the floating element is open and has a `handleClose` handler. Also
  // handles nested floating elements.
  // https://github.com/floating-ui/floating-ui/issues/1722
  createEffect(() => {
    if (!enabled()) {
      return;
    }

    if (open() && props.handleClose?.__options?.blockPointerEvents && isHoverOpen()) {
      performedPointerEventsMutationRef = true;
      const floatingEl = floatingElement();

      if (isElement(domReferenceElement()) && floatingEl) {
        const body = getDocument(floatingEl).body;
        body.setAttribute(safePolygonIdentifier, '');

        const ref = domReferenceElement()! as HTMLElement | SVGSVGElement;

        const parentNode = tree?.nodesRef.find((node) => node.id === parentId);
        const parentFloating = parentNode
          ? access(parentNode.context)?.elements.floating()
          : undefined;

        if (parentFloating) {
          parentFloating.style.pointerEvents = '';
        }

        body.style.pointerEvents = 'none';
        ref.style.pointerEvents = 'auto';
        floatingEl.style.pointerEvents = 'auto';

        onCleanup(() => {
          body.style.pointerEvents = '';
          ref.style.pointerEvents = '';
          floatingEl.style.pointerEvents = '';
        });
      }
    }
  });

  createEffect(() => {
    if (!open()) {
      pointerTypeRef = undefined;
      restTimeoutPendingRef = false;
      interactedInsideRef = false;
      cleanupMouseMoveHandler();
      clearPointerEvents();
    }
  });

  createEffect(
    on([enabled, domReferenceElement], () => {
      onCleanup(() => {
        cleanupMouseMoveHandler();
        timeout.clear();
        restTimeout.clear();
        clearPointerEvents();
        interactedInsideRef = false;
      });
    }),
  );

  onCleanup(() => {
    clearPointerEvents();
  });

  function setPointerRef(event: PointerEvent) {
    pointerTypeRef = event.pointerType;
  }

  const reference = createMemo<ElementProps['reference']>(() => {
    return {
      ref: () => {
        onCleanup(() => {
          // @ts-expect-error TODO: even though its not in the types this is valid
          context().refs?.setReference?.(null);
        });
      },
      onPointerDown: setPointerRef,
      onPointerEnter: setPointerRef,
      onMouseMove(event) {
        const trigger = event.currentTarget as HTMLElement;

        // `true` when there are multiple triggers per floating element and user hovers over the one that
        // wasn't used to open the floating element.
        const isOverInactiveTrigger =
          store().select('domReferenceElement') &&
          !contains(store().select('domReferenceElement'), event.target as Element);

        function handleMouseMove() {
          if (!blockMouseMoveRef && (!store().select('open') || isOverInactiveTrigger)) {
            store().setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, trigger));
          }
        }

        if (mouseOnly() && !isMouseLikePointerType(pointerTypeRef)) {
          return;
        }

        if ((store().select('open') && !isOverInactiveTrigger) || restMs() === 0) {
          return;
        }

        // Ignore insignificant movements to account for tremors.
        if (
          !isOverInactiveTrigger &&
          restTimeoutPendingRef &&
          event.movementX ** 2 + event.movementY ** 2 < 2
        ) {
          return;
        }

        restTimeout.clear();

        if (pointerTypeRef === 'touch') {
          handleMouseMove();
        } else if (isOverInactiveTrigger) {
          handleMouseMove();
        } else {
          restTimeoutPendingRef = true;
          restTimeout.start(restMs(), handleMouseMove);
        }
      },
    };
  });

  const returnValue = createMemo<ElementProps>(() => {
    if (!enabled()) {
      return {};
    }

    return { reference: reference() };
  });

  return returnValue;
}
