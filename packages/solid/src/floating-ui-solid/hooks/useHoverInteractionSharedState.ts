import { onCleanup, onMount } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import { useTimeout } from '../../utils/useTimeout';
import type { ContextData, FloatingRootContext, SafePolygonOptions } from '../types';
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

type HoverContextData = ContextData & {
  hoverInteractionState?: HoverInteraction | undefined;
};

export function useHoverInteractionSharedState(parameters: {
  store: FloatingRootContext;
}): [Store<HoverInteraction>, SetStoreFunction<HoverInteraction>] {
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

  onMount(() => {
    const data = parameters.store.context.dataRef as HoverContextData;
    if (!data.hoverInteractionState) {
      data.hoverInteractionState = state;
    }
  });

  onCleanup(() => {
    state.openChangeTimeout.clear();
    state.restTimeout.clear();
  });

  return [state, setState] as const;
}
