import { createEffect, untrack, type JSX } from 'solid-js';
import { SolidStore } from '../store/SolidStoreV2';
import { useOpenChangeComplete } from '../useOpenChangeComplete';
import { useTransitionStatus } from '../useTransitionStatus';
import {
  PopupStoreContext,
  popupStoreSelectors,
  PopupStoreSelectors,
  PopupStoreState,
} from './store';

/**
 * Returns a callback ref that registers/unregisters the trigger element in the store.
 *
 * @param store The Store instance where the trigger should be registered.
 */
export function useTriggerRegistration<State extends PopupStoreState<any>>(props: {
  id: string | undefined;
  store: SolidStore<State, PopupStoreContext<any>, PopupStoreSelectors>;
}) {
  const store = untrack(() => props.store);
  // Keep track of the currently registered element to unregister it on unmount or id change.
  let registeredElementIdRef = null as string | null;
  let registeredElementRef = null as Element | null;

  function registerTrigger(element: Element | null | undefined) {
    const id = props.id;
    if (id === undefined) {
      return;
    }

    if (registeredElementIdRef !== null) {
      const registeredId = registeredElementIdRef;
      const registeredElement = registeredElementRef;
      const currentElement = store.context.triggerElements.getById(registeredId);

      if (registeredElement && currentElement === registeredElement) {
        store.context.triggerElements.delete(registeredId);
      }

      registeredElementIdRef = null;
      registeredElementRef = null;
    }

    if (element != null) {
      registeredElementIdRef = id;
      registeredElementRef = element;
      store.context.triggerElements.add(id, element);
    }
  }

  return registerTrigger;
}

/**
 * Sets up trigger data forwarding to the store.
 *
 * @param triggerId Id of the trigger.
 * @param triggerElement The trigger DOM element.
 * @param store The Store instance managing the popup state.
 * @param stateUpdates An object with state updates to apply when the trigger is active.
 */
export function useTriggerDataForwarding<State extends PopupStoreState<any>>(props: {
  triggerId: string | undefined;
  triggerElement: Element | null | undefined;
  store: SolidStore<State, PopupStoreContext<any>, typeof popupStoreSelectors>;
  stateUpdates: Omit<Partial<State>, 'activeTriggerId' | 'activeTriggerElement'>;
}) {
  const store = untrack(() => props.store);
  const isMountedByThisTrigger = store.useState('isMountedByTrigger', () => props.triggerId);

  const baseRegisterTrigger = useTriggerRegistration({
    get id() {
      return props.triggerId;
    },
    get store() {
      return store;
    },
  });

  const registerTrigger = (element: Element | null | undefined) => {
    baseRegisterTrigger(element);

    if (!element || !store.select('open')) {
      return;
    }

    const activeTriggerId = store.select('activeTriggerId');

    if (activeTriggerId === props.triggerId) {
      store.update({
        activeTriggerElement: element,
        ...props.stateUpdates,
      } as Partial<State>);
      return;
    }

    if (activeTriggerId == null) {
      // This runs when popup is open, but no active trigger is set.
      // It can happen when using controlled mode and the trigger is mounted after opening or if `triggerId` prop is not set explicitly.
      // In such cases the first trigger to run this code becomes the active trigger (store.select('activeTriggerId') should not return null after that).
      // This is mostly for compatibility with contained triggers where no explicit `triggerId` was required in controlled mode.
      store.update({
        activeTriggerId: props.triggerId,
        activeTriggerElement: element,
        ...props.stateUpdates,
      } as Partial<State>);
    }
  };

  createEffect(() => {
    if (isMountedByThisTrigger()) {
      store.update({
        activeTriggerElement: props.triggerElement,
        ...props.stateUpdates,
      } as Partial<State>);
    }
  });

  return { registerTrigger, isMountedByThisTrigger };
}

export type PayloadChildRenderFunction<Payload> = (arg: {
  payload: Payload | undefined;
}) => JSX.Element;

/**
 * Ensures that when there's only one trigger element registered, it is set as the active trigger.
 * This allows controlled popups to work correctly without an explicit triggerId, maintaining compatibility
 * with the contained triggers.
 *
 * This should be called on the Root part.
 *
 * @param open Whether the popup is open.
 * @param store The Store instance managing the popup state.
 */
export function useImplicitActiveTrigger<State extends PopupStoreState<any>>(props: {
  store: SolidStore<State, PopupStoreContext<any>, typeof popupStoreSelectors>;
}) {
  const store = untrack(() => props.store);
  const open = store.useState('open');

  createEffect(() => {
    if (open() && !store.select('activeTriggerId') && store.context.triggerElements.size === 1) {
      const iteratorResult = store.context.triggerElements.entries().next();
      if (!iteratorResult.done) {
        const [implicitTriggerId, implicitTriggerElement] = iteratorResult.value;
        store.update({
          activeTriggerId: implicitTriggerId,
          activeTriggerElement: implicitTriggerElement,
        } as Partial<State>);
      }
    }
  });
}

/**
 * Mangages the mounted state of the popup.
 * Sets up the transition status listeners and handles unmounting when needed.
 * Updates the `mounted` and `transitionStatus` states in the store.
 *
 * @param open Whether the popup is open.
 * @param store The Store instance managing the popup state.
 * @param onUnmount Optional callback to be called when the popup is unmounted.
 *
 * @returns A function to forcibly unmount the popup.
 */
export function useOpenStateTransitions<State extends PopupStoreState<any>>(props: {
  open: boolean;
  store: SolidStore<State, PopupStoreContext<any>, typeof popupStoreSelectors>;
  onUnmount?: () => void;
}) {
  const { mounted, setMounted, transitionStatus } = useTransitionStatus(() => props.open);
  const store = untrack(() => props.store);

  store.useSyncedValues({ mounted, transitionStatus });

  const forceUnmount = () => {
    setMounted(false);
    store.update({
      activeTriggerId: null,
      activeTriggerElement: null,
      mounted: false,
    } as Partial<State>);
    props.onUnmount?.();
    store.context.onOpenChangeComplete?.(false);
  };

  const preventUnmountingOnClose = store.useState('preventUnmountingOnClose');

  useOpenChangeComplete({
    get enabled() {
      return !preventUnmountingOnClose();
    },
    get open() {
      return props.open;
    },
    get ref() {
      return store.context.popupRef.current;
    },
    onComplete() {
      if (!props.open) {
        forceUnmount();
      }
    },
  });

  return { forceUnmount, transitionStatus };
}
