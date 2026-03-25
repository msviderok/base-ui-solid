import { onCleanup } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import { useTimeout } from '../../utils/useTimeout';
import type { SafePolygonOptions } from '../types';
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

export function useHoverInteractionSharedState(): [
  Store<HoverInteraction>,
  SetStoreFunction<HoverInteraction>,
] {
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

  onCleanup(() => {
    state.openChangeTimeout.clear();
    state.restTimeout.clear();
  });

  return [state, setState] as const;
}
