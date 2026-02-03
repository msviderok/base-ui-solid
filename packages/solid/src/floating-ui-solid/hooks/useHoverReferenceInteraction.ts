import { isElement } from '@floating-ui/utils/dom';
import { createEffect, onCleanup, mergeProps as solidMergeProps } from 'solid-js';
import { type MaybeAccessor, access } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { FloatingUIOpenChangeDetails, HTMLProps } from '../../utils/types';
import { useFloatingTree } from '../components/FloatingTree';
import type { FloatingContext, FloatingRootContext } from '../types';
import { contains, getDocument, isMouseLikePointerType } from '../utils';
import type { UseHoverProps } from './useHover';
import { getDelay } from './useHover';
import {
  safePolygonIdentifier,
  useHoverInteractionSharedState,
} from './useHoverInteractionSharedState';

export interface UseHoverReferenceInteractionProps extends Omit<UseHoverProps, 'triggerElement'> {
  /**
   * Whether the hook controls the active trigger. When false, the props are
   * returned under the `trigger` key so they can be applied to inactive
   * triggers via `getTriggerProps`.
   * @default true
   */
  isActiveTrigger?: MaybeAccessor<boolean | undefined>;
  triggerElementRef?: Readonly<Element | null | undefined>;
}

function getRestMs(value: MaybeAccessor<number>) {
  return access(value);
}

const EMPTY_REF: Readonly<Element | null | undefined> = null;

/**
 * Provides hover interactions that should be attached to reference or trigger
 * elements.
 */
export function useHoverReferenceInteraction(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  props: UseHoverReferenceInteractionProps = {},
): HTMLProps | undefined {
  const context = () => access(contextProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const dataRef = () => store().context.dataRef;
  const events = () => store().context.events;

  const enabled = () => access(props.enabled) ?? true;
  const delay = () => access(props.delay) ?? 0;
  const handleClose = () => props.handleClose ?? null;
  const mouseOnly = () => access(props.mouseOnly) ?? false;
  const restMs = () => access(props.restMs) ?? 0;
  const move = () => access(props.move) ?? true;
  const triggerElementRef = () => access(props.triggerElementRef) ?? EMPTY_REF;
  const isActiveTrigger = () => access(props.isActiveTrigger) ?? true;

  const tree = useFloatingTree(props.externalTree);

  const sharedState = useHoverInteractionSharedState(store);

  createEffect(() => {
    if (isActiveTrigger()) {
      sharedState.handleCloseOptionsRef = handleClose()?.__options;
    }
  });

  const isClickLikeOpenEvent = () => {
    if (sharedState.interactedInsideRef) {
      return true;
    }

    const dr = dataRef();
    return dr.openEvent ? ['click', 'mousedown'].includes(dr.openEvent.type) : false;
  };

  const closeWithDelay = (event: MouseEvent, runElseBranch = true) => {
    const closeDelay = getDelay(delay(), 'close', sharedState.pointerTypeRef);
    if (closeDelay && !sharedState.handlerRef) {
      sharedState.openChangeTimeout.start(closeDelay, () =>
        store().setOpen(false, createChangeEventDetails(REASONS.triggerHover, event)),
      );
    } else if (runElseBranch) {
      sharedState.openChangeTimeout.clear();
      store().setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
    }
  };

  const cleanupMouseMoveHandler = () => {
    sharedState.unbindMouseMoveRef();
    sharedState.handlerRef = undefined;
  };

  const clearPointerEvents = () => {
    if (sharedState.performedPointerEventsMutationRef) {
      const body = getDocument(store().select('domReferenceElement')).body;
      body.style.pointerEvents = '';
      body.removeAttribute(safePolygonIdentifier);
      sharedState.performedPointerEventsMutationRef = false;
    }
  };

  function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
    if (!details.open) {
      sharedState.openChangeTimeout.clear();
      sharedState.restTimeout.clear();
      sharedState.blockMouseMoveRef = true;
      sharedState.restTimeoutPendingRef = false;
    }
  }

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  createEffect(() => {
    if (!enabled()) {
      return;
    }

    events().on('openchange', onOpenChangeLocal);
    onCleanup(() => events().off('openchange', onOpenChangeLocal));
  });

  const handleScrollMouseLeave = (event: MouseEvent) => {
    if (isClickLikeOpenEvent()) {
      return;
    }

    if (!dataRef().floatingContext) {
      return;
    }

    const triggerElements = store().context.triggerElements;
    if (event.relatedTarget && triggerElements.hasElement(event.relatedTarget as Element)) {
      return;
    }

    const currentTrigger = triggerElementRef();
    const mergedProps = solidMergeProps(dataRef().floatingContext, {
      tree,
      x: () => event.clientX,
      y: () => event.clientY,
      onClose() {
        clearPointerEvents();
        cleanupMouseMoveHandler();
        if (!isClickLikeOpenEvent() && currentTrigger === store().select('domReferenceElement')) {
          closeWithDelay(event);
        }
      },
    });

    handleClose()?.(mergedProps)?.(event);
  };

  createEffect(() => {
    if (!enabled()) {
      return;
    }

    const trigger =
      (triggerElementRef() as HTMLElement | null) ??
      (isActiveTrigger() ? (store().select('domReferenceElement') as HTMLElement | null) : null);

    if (!isElement(trigger)) {
      return;
    }

    function onMouseEnter(event: MouseEvent) {
      sharedState.openChangeTimeout.clear();
      sharedState.blockMouseMoveRef = false;

      if (mouseOnly() && !isMouseLikePointerType(sharedState.pointerTypeRef)) {
        return;
      }

      // Only rest delay is set; there's no fallback delay.
      // This will be handled by `onMouseMove`.
      if (getRestMs(restMs()) > 0 && !getDelay(delay(), 'open')) {
        return;
      }

      const openDelay = getDelay(delay(), 'open', sharedState.pointerTypeRef);
      const currentDomReference = store().select('domReferenceElement');
      const allTriggers = store().context.triggerElements;

      const isOverInactiveTrigger =
        (allTriggers.hasElement(event.target as Element) ||
          allTriggers.hasMatchingElement((t) => contains(t, event.target as Element))) &&
        (!currentDomReference || !contains(currentDomReference, event.target as Element));

      const triggerNode = (event.currentTarget as HTMLElement) ?? null;

      const shouldOpen = !store().select('open') || isOverInactiveTrigger;

      if (openDelay) {
        sharedState.openChangeTimeout.start(openDelay, () => {
          if (shouldOpen) {
            store().setOpen(
              true,
              createChangeEventDetails(REASONS.triggerHover, event, triggerNode),
            );
          }
        });
      } else if (shouldOpen) {
        store().setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, triggerNode));
      }
    }

    function onMouseLeave(event: MouseEvent) {
      if (isClickLikeOpenEvent()) {
        clearPointerEvents();
        return;
      }

      sharedState.unbindMouseMoveRef();

      const domReferenceElement = store().select('domReferenceElement');
      const doc = getDocument(domReferenceElement);
      sharedState.restTimeout.clear();
      sharedState.restTimeoutPendingRef = false;

      const triggerElements = store().context.triggerElements;

      if (event.relatedTarget && triggerElements.hasElement(event.relatedTarget as Element)) {
        return;
      }

      const handleCloseFn = handleClose();
      if (handleCloseFn && dataRef().floatingContext) {
        if (!store().select('open')) {
          sharedState.openChangeTimeout.clear();
        }

        const currentTrigger = triggerElementRef();

        const mergedProps = solidMergeProps(dataRef().floatingContext, {
          tree,
          x: () => event.clientX,
          y: () => event.clientY,
          onClose() {
            clearPointerEvents();
            cleanupMouseMoveHandler();
            if (
              !isClickLikeOpenEvent() &&
              currentTrigger === store().select('domReferenceElement')
            ) {
              closeWithDelay(event, true);
            }
          },
        });

        const handler = handleCloseFn(mergedProps);
        handler(event);

        doc.addEventListener('mousemove', handler);
        sharedState.unbindMouseMoveRef = () => {
          doc.removeEventListener('mousemove', handler);
        };

        return;
      }

      const shouldClose =
        sharedState.pointerTypeRef === 'touch'
          ? !contains(store().select('floatingElement'), event.relatedTarget as Element | null)
          : true;

      if (shouldClose) {
        closeWithDelay(event);
      }
    }

    function onScrollMouseLeave(event: MouseEvent) {
      handleScrollMouseLeave(event);
    }

    if (store().select('open')) {
      trigger.addEventListener('mouseleave', onScrollMouseLeave);
    }

    if (move()) {
      trigger.addEventListener('mousemove', onMouseEnter, {
        once: true,
      });
    }

    trigger.addEventListener('mouseenter', onMouseEnter);
    trigger.addEventListener('mouseleave', onMouseLeave);

    onCleanup(() => {
      trigger.removeEventListener('mouseleave', onScrollMouseLeave);

      if (move()) {
        trigger.removeEventListener('mousemove', onMouseEnter);
      }

      trigger.removeEventListener('mouseenter', onMouseEnter);
      trigger.removeEventListener('mouseleave', onMouseLeave);
    });
  });

  function setPointerRef(event: PointerEvent) {
    sharedState.pointerTypeRef = event.pointerType;
  }

  return {
    onPointerDown: setPointerRef,
    onPointerEnter: setPointerRef,
    onMouseMove(event) {
      const trigger = event.currentTarget as HTMLElement;

      const currentDomReference = store().select('domReferenceElement');
      const allTriggers = store().context.triggerElements;
      const currentOpen = store().select('open');

      const isOverInactiveTrigger =
        (allTriggers.hasElement(event.target as Element) ||
          allTriggers.hasMatchingElement((t) => contains(t, event.target as Element))) &&
        (!currentDomReference || !contains(currentDomReference, event.target as Element));

      if (mouseOnly() && !isMouseLikePointerType(sharedState.pointerTypeRef)) {
        return;
      }

      if ((currentOpen && !isOverInactiveTrigger) || getRestMs(restMs()) === 0) {
        return;
      }

      if (
        !isOverInactiveTrigger &&
        sharedState.restTimeoutPendingRef &&
        event.movementX ** 2 + event.movementY ** 2 < 2
      ) {
        return;
      }

      sharedState.restTimeout.clear();

      function handleMouseMove() {
        sharedState.restTimeoutPendingRef = false;

        // A delayed hover open should not override a click-like open that happened
        // while the hover delay was pending.
        if (isClickLikeOpenEvent()) {
          return;
        }

        const latestOpen = store().select('open');

        if (!sharedState.blockMouseMoveRef && (!latestOpen || isOverInactiveTrigger)) {
          store().setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, trigger));
        }
      }

      if (sharedState.pointerTypeRef === 'touch') {
        handleMouseMove();
      } else if (isOverInactiveTrigger && currentOpen) {
        handleMouseMove();
      } else {
        sharedState.restTimeoutPendingRef = true;
        sharedState.restTimeout.start(getRestMs(restMs()), handleMouseMove);
      }
    },
  };
}
