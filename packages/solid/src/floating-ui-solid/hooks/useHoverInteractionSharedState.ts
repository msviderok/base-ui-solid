import { createEffect } from 'solid-js';
import { type MaybeAccessor, access } from '../../solid-helpers';
import { useTimeout } from '../../utils/useTimeout';
import type { ContextData, FloatingRootContext, SafePolygonOptions } from '../types';
import { TYPEABLE_SELECTOR } from '../utils/constants';
import { createAttribute } from '../utils/createAttribute';

export const safePolygonIdentifier = createAttribute('safe-polygon');
const interactiveSelector = `button,a,[role="button"],select,[tabindex]:not([tabindex="-1"]),${TYPEABLE_SELECTOR}`;

export function isInteractiveElement(element: Element | null | undefined) {
  return element ? Boolean(element.closest(interactiveSelector)) : false;
}

export interface HoverInteractionSharedState {
  pointerTypeRef: string | undefined;
  interactedInsideRef: boolean;
  handlerRef: ((event: MouseEvent) => void) | undefined;
  blockMouseMoveRef: boolean;
  performedPointerEventsMutationRef: boolean;
  unbindMouseMoveRef: () => void;
  restTimeoutPendingRef: boolean;
  openChangeTimeout: ReturnType<typeof useTimeout>;
  restTimeout: ReturnType<typeof useTimeout>;
  handleCloseOptionsRef: SafePolygonOptions | undefined;
}

type HoverContextData = ContextData & {
  hoverInteractionState?: HoverInteractionSharedState;
};

export function useHoverInteractionSharedState(
  store: MaybeAccessor<FloatingRootContext>,
): HoverInteractionSharedState {
  const state: HoverInteractionSharedState = {
    pointerTypeRef: undefined,
    interactedInsideRef: false,
    handlerRef: undefined,
    blockMouseMoveRef: true,
    performedPointerEventsMutationRef: false,
    unbindMouseMoveRef: () => {},
    restTimeoutPendingRef: false,
    openChangeTimeout: useTimeout(),
    restTimeout: useTimeout(),
    handleCloseOptionsRef: undefined,
  };

  createEffect(() => {
    const data = access(store).context.dataRef as HoverContextData;

    if (!data.hoverInteractionState) {
      data.hoverInteractionState = state;
    }
  });

  return state;
}
