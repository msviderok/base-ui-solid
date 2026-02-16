import { ownerDocument } from '@base-ui/utils/owner';
import { isElement } from '@floating-ui/utils/dom';
import { createEffect, onCleanup, mergeProps as solidMergeProps } from 'solid-js';
import { produce } from 'solid-js/store';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import type { FloatingContext, FloatingRootContext } from '../types';
import { getTarget, isMouseLikePointerType, isTargetInsideEnabledTrigger } from '../utils';
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
  enabled?: boolean | undefined;
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  closeDelay?: (number | (() => number)) | undefined;
};

const clickLikeEvents = new Set(['click', 'mousedown']);

/**
 * Provides hover interactions that should be attached to the floating element.
 */
export function useHoverFloatingInteraction(parameters: {
  context: FloatingRootContext | FloatingContext;
  parameters: UseHoverFloatingInteractionProps;
}): void {
  const params = solidMergeProps(parameters.parameters, { enabled: true, closeDelay: 0 });
  const store =
    'rootStore' in parameters.context ? parameters.context.rootStore : parameters.context;

  const open = store.useState('open');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');
  const dataRef = store.context.dataRef;

  const [instance, setInstanceState] = useHoverInteractionSharedState({ store });

  const tree = useFloatingTree();
  const parentId = useFloatingParentNodeId();

  const isClickLikeOpenEvent = () => {
    if (instance.interactedInside) {
      return true;
    }

    return dataRef.openEvent ? clickLikeEvents.has(dataRef.openEvent.type) : false;
  };

  const isHoverOpen = () =>
    dataRef.openEvent?.type?.includes('mouse') && dataRef.openEvent.type !== 'mousedown';

  const isRelatedTargetInsideEnabledTrigger = (target: EventTarget | null | undefined) =>
    isTargetInsideEnabledTrigger(target, store.context.triggerElements);

  const closeWithDelay = (event: MouseEvent, runElseBranch = true) => {
    const closeDelay = getDelay(params.closeDelay, instance.pointerType);
    if (closeDelay && !instance.handler) {
      instance.openChangeTimeout.start(closeDelay, () =>
        store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event)),
      );
    } else if (runElseBranch) {
      instance.openChangeTimeout.clear();
      store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
    }
  };

  const cleanupMouseMoveHandler = () => {
    instance.unbindMouseMove();
    setInstanceState('handler', undefined);
  };

  const clearPointerEvents = () => {
    if (instance.performedPointerEventsMutation) {
      const body = ownerDocument(floatingElement() ?? null).body;
      body.style.pointerEvents = '';
      body.removeAttribute(safePolygonIdentifier);
      setInstanceState('performedPointerEventsMutation', false);
    }
  };

  const handleInteractInside = (event: PointerEvent) => {
    const target = getTarget(event) as Element | null;
    if (!isInteractiveElement(target)) {
      setInstanceState('interactedInside', false);
      return;
    }

    setInstanceState('interactedInside', true);
  };

  createEffect(() => {
    if (!open()) {
      setInstanceState(
        produce((i) => {
          i.pointerType = undefined;
          i.restTimeoutPending = false;
          i.interactedInside = false;
        }),
      );
      cleanupMouseMoveHandler();
      clearPointerEvents();
    }
  });

  onCleanup(() => {
    cleanupMouseMoveHandler();
    clearPointerEvents();
  });

  createEffect(() => {
    if (!params.enabled) {
      return;
    }

    const domReference = domReferenceElement();
    const floatingEl = floatingElement() ?? null;
    if (
      open() &&
      instance.handleCloseOptions?.blockPointerEvents &&
      isHoverOpen() &&
      isElement(domReference) &&
      floatingEl
    ) {
      setInstanceState('performedPointerEventsMutation', true);
      const body = ownerDocument(floatingEl).body;
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
    if (!params.enabled) {
      return;
    }

    // Ensure the floating element closes after scrolling even if the pointer
    // did not move.
    // https://github.com/floating-ui/floating-ui/discussions/1692
    function onScrollMouseLeave(event: MouseEvent) {
      if (isClickLikeOpenEvent() || !dataRef.floatingContext || !store.select('open')) {
        return;
      }

      if (isRelatedTargetInsideEnabledTrigger(event.relatedTarget)) {
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
      instance.openChangeTimeout.clear();
      clearPointerEvents();
      instance.handler?.(event);
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
  value: number | (() => number),
  pointerType?: PointerEvent['pointerType'],
) {
  if (pointerType && !isMouseLikePointerType(pointerType)) {
    return 0;
  }

  if (typeof value === 'function') {
    return value();
  }

  return value;
}
