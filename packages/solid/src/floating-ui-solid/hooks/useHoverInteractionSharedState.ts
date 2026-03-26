import { createEffect, createRenderEffect, onCleanup } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import { useTimeout } from '../../utils/useTimeout';
import type { FloatingRootContext, SafePolygonOptions } from '../types';
import { TYPEABLE_SELECTOR } from '../utils/constants';
import { createAttribute } from '../utils/createAttribute';

export const safePolygonIdentifier = createAttribute('safe-polygon');
const interactiveSelector = `button,a,[role="button"],select,[tabindex]:not([tabindex="-1"]),${TYPEABLE_SELECTOR}`;

export function isInteractiveElement(element: Element | null | undefined) {
  return element ? Boolean(element.closest(interactiveSelector)) : false;
}

export interface HoverInteraction {
  pointerType: string | undefined;
  interactedInside: boolean;
  handler: ((event: MouseEvent) => void) | undefined;
  blockMouseMove: boolean;
  performedPointerEventsMutation: boolean;
  unbindMouseMove: () => void;
  restTimeoutPending: boolean;
  openChangeTimeout: ReturnType<typeof useTimeout>;
  restTimeout: ReturnType<typeof useTimeout>;
  handleCloseOptions: SafePolygonOptions | undefined;
}

type HoverInteractionSharedState = [Store<HoverInteraction>, SetStoreFunction<HoverInteraction>];

type HoverContextData = {
  hoverInteractionState?: HoverInteractionSharedState | undefined;
};

function createHoverInteractionSharedState(): HoverInteractionSharedState {
  const [state, setState] = createStore<HoverInteraction>({
    pointerType: undefined,
    interactedInside: false,
    handler: undefined,
    blockMouseMove: true,
    performedPointerEventsMutation: false,
    unbindMouseMove: () => {},
    restTimeoutPending: false,
    openChangeTimeout: useTimeout(),
    restTimeout: useTimeout(),
    handleCloseOptions: undefined,
  });

  return [state, setState] as const;
}

export function useHoverInteractionSharedState(options: {
  store: FloatingRootContext;
}): HoverInteractionSharedState {
  createRenderEffect(() => {
    if (!options.store.context.dataRef.hoverInteractionState) {
      options.store.context.dataRef.hoverInteractionState = createHoverInteractionSharedState();
    }
  });

  onCleanup(() => {
    options.store.context.dataRef.hoverInteractionState?.[0].openChangeTimeout.clear();
    options.store.context.dataRef.hoverInteractionState?.[0].restTimeout.clear();
  });

  return options.store.context.dataRef.hoverInteractionState;
}
