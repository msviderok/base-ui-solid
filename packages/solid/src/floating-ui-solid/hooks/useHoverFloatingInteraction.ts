import { isElement } from '@floating-ui/utils/dom';
import { createEffect, onCleanup } from 'solid-js';
import { type MaybeAccessor, access } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import { FloatingTreeStore } from '../components/FloatingTreeStore';
import type { FloatingContext, FloatingRootContext } from '../types';
import { getDocument, getTarget, isMouseLikePointerType } from '../utils';
import {
  isInteractiveElement,
  safePolygonIdentifier,
  useHoverInteractionSharedState,
} from './useHoverInteractionSharedState';

export type UseHoverFloatingInteractionProps = {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: MaybeAccessor<boolean | undefined>;
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  closeDelay?: MaybeAccessor<number | undefined>;
  /**
   * An optional external floating tree to use instead of the default context.
   */
  externalTree?: FloatingTreeStore;
};

const clickLikeEvents = new Set(['click', 'mousedown']);

/**
 * Provides hover interactions that should be attached to the floating element.
 */
export function useHoverFloatingInteraction(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  parameters: UseHoverFloatingInteractionProps = {},
): void {
  const context = () => access(contextProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const open = () => store().useState('open')();
  const floatingElement = () => store().useState('floatingElement')();
  const domReferenceElement = () => store().useState('domReferenceElement')();
  const dataRef = () => store().context.dataRef;

  const enabled = () => access(parameters.enabled) ?? true;
  const closeDelayProp = () => access(parameters.closeDelay) ?? 0;

  const sharedState = useHoverInteractionSharedState(store);

  const tree = useFloatingTree(parameters.externalTree);
  const parentId = useFloatingParentNodeId();

  const isClickLikeOpenEvent = () => {
    if (sharedState.interactedInsideRef) {
      return true;
    }

    const dr = dataRef();
    return dr.openEvent ? clickLikeEvents.has(dr.openEvent.type) : false;
  };

  const isHoverOpen = () => {
    const type = dataRef().openEvent?.type;
    return type?.includes('mouse') && type !== 'mousedown';
  };

  const closeWithDelay = (event: MouseEvent, runElseBranch = true) => {
    const closeDelay = getDelay(closeDelayProp(), sharedState.pointerTypeRef);
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
      const body = getDocument(floatingElement()).body;
      body.style.pointerEvents = '';
      body.removeAttribute(safePolygonIdentifier);
      sharedState.performedPointerEventsMutationRef = false;
    }
  };

  const handleInteractInside = (event: PointerEvent) => {
    const target = getTarget(event) as Element | null;
    if (!isInteractiveElement(target)) {
      sharedState.interactedInsideRef = false;
      return;
    }

    sharedState.interactedInsideRef = true;
  };

  createEffect(() => {
    if (!open()) {
      sharedState.pointerTypeRef = undefined;
      sharedState.restTimeoutPendingRef = false;
      sharedState.interactedInsideRef = false;
      cleanupMouseMoveHandler();
      clearPointerEvents();
    }
  });

  onCleanup(() => {
    cleanupMouseMoveHandler();
    clearPointerEvents();
  });

  createEffect(() => {
    if (!enabled()) {
      return;
    }

    const domReference = domReferenceElement();
    const floatingEl = floatingElement();
    if (
      open() &&
      sharedState.handleCloseOptionsRef?.blockPointerEvents &&
      isHoverOpen() &&
      isElement(domReference) &&
      floatingEl
    ) {
      sharedState.performedPointerEventsMutationRef = true;
      const body = getDocument(floatingEl).body;
      body.setAttribute(safePolygonIdentifier, '');

      const ref = domReference as HTMLElement | SVGSVGElement;

      const parentFloating = tree?.nodesRef
        .find((node) => node.id === parentId)
        ?.context?.elements.floating();

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
  });

  createEffect(() => {
    if (!enabled()) {
      return;
    }

    // Ensure the floating element closes after scrolling even if the pointer
    // did not move.
    // https://github.com/floating-ui/floating-ui/discussions/1692
    function onScrollMouseLeave(event: MouseEvent) {
      if (isClickLikeOpenEvent() || !dataRef().floatingContext || !store().select('open')) {
        return;
      }

      const triggerElements = store().context.triggerElements;
      if (event.relatedTarget && triggerElements.hasElement(event.relatedTarget as Element)) {
        // If the mouse is leaving the reference element to another trigger, don't explicitly close the popup
        // as it will be moved.
        return;
      }

      clearPointerEvents();
      cleanupMouseMoveHandler();
      if (!isClickLikeOpenEvent()) {
        closeWithDelay(event);
      }
    }

    function onFloatingMouseEnter(event: MouseEvent) {
      sharedState.openChangeTimeout.clear();
      clearPointerEvents();
      sharedState.handlerRef?.(event);
      cleanupMouseMoveHandler();
    }

    function onFloatingMouseLeave(event: MouseEvent) {
      if (!isClickLikeOpenEvent()) {
        closeWithDelay(event, false);
      }
    }

    const floating = floatingElement();
    if (floating) {
      floating.addEventListener('mouseleave', onScrollMouseLeave);
      floating.addEventListener('mouseenter', onFloatingMouseEnter);
      floating.addEventListener('mouseleave', onFloatingMouseLeave);
      floating.addEventListener('pointerdown', handleInteractInside, true);
    }

    onCleanup(() => {
      if (floating) {
        floating.removeEventListener('mouseleave', onScrollMouseLeave);
        floating.removeEventListener('mouseenter', onFloatingMouseEnter);
        floating.removeEventListener('mouseleave', onFloatingMouseLeave);
        floating.removeEventListener('pointerdown', handleInteractInside, true);
      }
    });
  });
}

export function getDelay(
  value: MaybeAccessor<number | undefined>,
  pointerType?: PointerEvent['pointerType'],
) {
  if (pointerType && !isMouseLikePointerType(pointerType)) {
    return 0;
  }

  return access(value);
}
