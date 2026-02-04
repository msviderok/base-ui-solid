import { FloatingRootContext } from '../../floating-ui-solid';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import { type MaybeAccessor } from '../../solid-helpers';
import { EMPTY_OBJECT } from '../constants';
import { HTMLProps } from '../types';
import { TransitionStatus } from '../useTransitionStatus';
import { PopupTriggerMap } from './popupTriggerMap';

/**
 * State common to all popup stores.
 */
export type PopupStoreState<Payload> = {
  /**
   * Whether the popup is open.
   */
  open: MaybeAccessor<boolean>;
  /**
   * Whether the popup should be mounted in the DOM.
   * This usually follows `open` but can be different during exit transitions.
   */
  mounted: MaybeAccessor<boolean>;
  /**
   * The current enter/exit transition status of the popup.
   */
  transitionStatus: MaybeAccessor<TransitionStatus>;

  floatingRootContext: FloatingRootContext;
  /**
   * Whether to prevent unmounting the popup when closed.
   * Useful for interactling with JS animation libraries that control unmounting themselves.
   */
  preventUnmountingOnClose: MaybeAccessor<boolean>;

  /**
   * Optional payload set by the trigger.
   */
  payload: MaybeAccessor<Payload | undefined>;

  /**
   * ID of the currently active trigger.
   */
  activeTriggerId: MaybeAccessor<string | null>;
  /**
   * The currently active trigger DOM element.
   */
  activeTriggerElement: MaybeAccessor<Element | null | undefined>;
  /**
   * The popup DOM element.
   */
  popupElement: MaybeAccessor<HTMLElement | null | undefined>;
  /**
   * The positioner DOM element.
   */
  positionerElement: MaybeAccessor<HTMLElement | null | undefined>;

  /**
   * Props to spread onto the active trigger element.
   */
  activeTriggerProps: MaybeAccessor<HTMLProps>;
  /**
   * Props to spread onto inactive trigger elements.
   */
  inactiveTriggerProps: MaybeAccessor<HTMLProps>;
  /**
   * Props to spread onto the popup element.
   */
  popupProps: MaybeAccessor<HTMLProps>;
};

export function createInitialPopupStoreState<Payload>(): PopupStoreState<Payload> {
  return {
    open: false,
    mounted: false,
    transitionStatus: 'idle',
    floatingRootContext: getEmptyRootContext(),
    preventUnmountingOnClose: false,
    payload: undefined,
    activeTriggerId: null,
    activeTriggerElement: null,
    popupElement: null,
    positionerElement: null,
    activeTriggerProps: EMPTY_OBJECT as HTMLProps,
    inactiveTriggerProps: EMPTY_OBJECT as HTMLProps,
    popupProps: EMPTY_OBJECT as HTMLProps,
  };
}

export type PopupStoreContext<ChangeEventDetails> = {
  /**
   * Map of registered trigger elements.
   */
  readonly triggerElements: PopupTriggerMap;
  /**
   * Reference to the popup element.
   */
  readonly popupRef: HTMLElement | null | undefined;
  /**
   * Callback fired when the open state changes.
   */
  onOpenChange?: (open: boolean, eventDetails: ChangeEventDetails) => void;
  /**
   * Callback fired when the open state change animation completes.
   */
  onOpenChangeComplete: ((open: boolean) => void) | undefined;
};

export const popupStoreSelectors = {
  open: (state: PopupStoreState<unknown>) => state.open,
  mounted: (state: PopupStoreState<unknown>) => state.mounted,
  transitionStatus: (state: PopupStoreState<unknown>) => state.transitionStatus,
  floatingRootContext: (state: PopupStoreState<unknown>) => state.floatingRootContext,
  preventUnmountingOnClose: (state: PopupStoreState<unknown>) => state.preventUnmountingOnClose,
  payload: (state: PopupStoreState<unknown>) => state.payload,
  activeTriggerId: (state: PopupStoreState<unknown>) => state.activeTriggerId,
  activeTriggerElement: (state: PopupStoreState<unknown>) =>
    state.mounted ? state.activeTriggerElement : null,
  /**
   * Whether the trigger with the given ID was used to open the popup.
   */
  isTriggerActive: (state: PopupStoreState<unknown>, triggerId: string | undefined) =>
    triggerId !== undefined && state.activeTriggerId === triggerId,
  /**
   * Whether the popup is open and was activated by a trigger with the given ID.
   */
  isOpenedByTrigger: (state: PopupStoreState<unknown>, triggerId: string | undefined) =>
    triggerId !== undefined && state.activeTriggerId === triggerId && state.open,
  /**
   * Whether the popup is mounted and was activated by a trigger with the given ID.
   */
  isMountedByTrigger: (state: PopupStoreState<unknown>, triggerId: string | undefined) =>
    triggerId !== undefined && state.activeTriggerId === triggerId && state.mounted,

  triggerProps: (state: PopupStoreState<unknown>, isActive: boolean) =>
    isActive ? state.activeTriggerProps : state.inactiveTriggerProps,
  popupProps: (state: PopupStoreState<unknown>) => state.popupProps,

  popupElement: (state: PopupStoreState<unknown>) => state.popupElement,
  positionerElement: (state: PopupStoreState<unknown>) => state.positionerElement,
};

export type PopupStoreSelectors = typeof popupStoreSelectors;
