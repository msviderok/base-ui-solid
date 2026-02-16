import { type Accessor } from 'solid-js';
import { createStore, type SetStoreFunction } from 'solid-js/store';
import { FloatingRootContext } from '../../floating-ui-solid';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import { EMPTY_OBJECT } from '../constants';
import { HTMLProps } from '../types';
import { TransitionStatus } from '../useTransitionStatus';
import { PopupTriggerMap } from './popupTriggerMap';

/**
 * State common to all popup stores.
 */
export type PopupStoreState<Payload> = {
  /**
   * Whether the popup is open (internal state).
   */
  open: boolean;
  /**
   * Whether the popup is open (external prop).
   */
  readonly openProp: boolean | undefined;
  /**
   * Whether the popup should be mounted in the DOM.
   * This usually follows `open` but can be different during exit transitions.
   */
  mounted: boolean;
  /**
   * The current enter/exit transition status of the popup.
   */
  transitionStatus: TransitionStatus;

  floatingRootContext: FloatingRootContext;
  /**
   * Whether to prevent unmounting the popup when closed.
   * Useful for interactling with JS animation libraries that control unmounting themselves.
   */
  preventUnmountingOnClose: boolean;

  /**
   * Optional payload set by the trigger.
   */
  payload: Payload | undefined;

  /**
   * ID of the currently active trigger.
   */
  activeTriggerId: string | null;
  /**
   * The currently active trigger DOM element.
   */
  activeTriggerElement: Element | null | undefined;
  /**
   * ID of the trigger (external prop).
   */
  readonly triggerIdProp: string | null | undefined;
  /**
   * The popup DOM element.
   */
  popupElement: HTMLElement | null | undefined;
  /**
   * The positioner DOM element.
   */
  positionerElement: HTMLElement | null | undefined;

  /**
   * Props to spread onto the active trigger element.
   */
  activeTriggerProps: HTMLProps;
  /**
   * Props to spread onto inactive trigger elements.
   */
  inactiveTriggerProps: HTMLProps;
  /**
   * Props to spread onto the popup element.
   */
  popupProps: HTMLProps;
};

export function createInitialPopupStoreState<Payload, State extends PopupStoreState<Payload>>(
  initialState: Partial<State> = {},
) {
  const [state, setState] = createStore({
    open: false,
    openProp: undefined,
    mounted: false,
    transitionStatus: 'idle',
    floatingRootContext: getEmptyRootContext(),
    preventUnmountingOnClose: false,
    payload: undefined,
    activeTriggerId: null,
    activeTriggerElement: null,
    triggerIdProp: undefined,
    popupElement: null,
    positionerElement: null,
    activeTriggerProps: EMPTY_OBJECT,
    inactiveTriggerProps: EMPTY_OBJECT,
    popupProps: EMPTY_OBJECT,
    ...initialState,
  });
  return [state, setState] as unknown as [State, SetStoreFunction<State>];
}

export type PopupStoreContext<ChangeEventDetails> = {
  /**
   * Map of registered trigger elements.
   */
  readonly triggerElements: PopupTriggerMap;
  /**
   * Reference to the popup element.
   */
  readonly refs: {
    popupRef: HTMLElement | null | undefined;
  };
  /**
   * Callback fired when the open state changes.
   */
  onOpenChange?: ((open: boolean, eventDetails: ChangeEventDetails) => void) | undefined;
  /**
   * Callback fired when the open state change animation completes.
   */
  onOpenChangeComplete: ((open: boolean) => void) | undefined;
};

type S = PopupStoreState<unknown>;

const activeTriggerIdSelector = (state: S) => state.triggerIdProp ?? state.activeTriggerId;

export const popupStoreSelectors = {
  open: (state: S) => state.openProp ?? state.open,
  mounted: (state: S) => state.mounted,
  transitionStatus: (state: S) => state.transitionStatus,
  floatingRootContext: (state: S) => state.floatingRootContext,
  preventUnmountingOnClose: (state: S) => state.preventUnmountingOnClose,
  payload: (state: S) => state.payload,
  activeTriggerId: activeTriggerIdSelector,
  activeTriggerElement: (state: S) => (state.mounted ? state.activeTriggerElement : null),
  /**
   * Whether the trigger with the given ID was used to open the popup.
   */
  isTriggerActive: (state: S, triggerId: Accessor<string | undefined>) =>
    triggerId() !== undefined && activeTriggerIdSelector(state) === triggerId(),
  /**
   * Whether the popup is open and was activated by a trigger with the given ID.
   */
  isOpenedByTrigger: (state: S, triggerId: Accessor<string | undefined>) =>
    triggerId() !== undefined && activeTriggerIdSelector(state) === triggerId() && state.open,
  /**
   * Whether the popup is mounted and was activated by a trigger with the given ID.
   */
  isMountedByTrigger: (state: S, triggerId: Accessor<string | undefined>) =>
    triggerId() !== undefined && activeTriggerIdSelector(state) === triggerId() && state.mounted,

  triggerProps: (state: S, isActive: Accessor<boolean>) =>
    isActive() ? state.activeTriggerProps : state.inactiveTriggerProps,
  popupProps: (state: S) => state.popupProps,

  popupElement: (state: S) => state.popupElement,
  positionerElement: (state: S) => state.positionerElement,
};

export type PopupStoreSelectors = typeof popupStoreSelectors;
