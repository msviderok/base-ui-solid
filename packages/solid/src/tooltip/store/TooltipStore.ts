import { mergeProps as solidMergeProps } from 'solid-js';
import { useSyncedFloatingRootContext } from '../../floating-ui-solid';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import type { ReactLikeRef } from '../../solid-helpers';
import {
  createInitialPopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupStoreState,
  PopupTriggerMap,
} from '../../utils/popups';
import { REASONS } from '../../utils/reasons';
import { SolidStore } from '../../utils/store/SolidStoreV2';
import { type TooltipRoot } from '../root/TooltipRoot';

export type State<Payload> = PopupStoreState<Payload> & {
  disabled: boolean;
  instantType: 'delay' | 'dismiss' | 'focus' | undefined;
  isInstantPhase: boolean;
  trackCursorAxis: 'none' | 'x' | 'y' | 'both';
  disableHoverablePopup: boolean;
  openChangeReason: TooltipRoot.ChangeEventReason | null;
  closeDelay: number;
  hasViewport: boolean;
};

export type Context = PopupStoreContext<TooltipRoot.ChangeEventDetails> & {
  popupRef: ReactLikeRef<HTMLElement | null | undefined>;
};

const selectors = {
  ...popupStoreSelectors,
  disabled: (state: State<unknown>) => state.disabled,
  instantType: (state: State<unknown>) => state.instantType,
  isInstantPhase: (state: State<unknown>) => state.isInstantPhase,
  trackCursorAxis: (state: State<unknown>) => state.trackCursorAxis,
  disableHoverablePopup: (state: State<unknown>) => state.disableHoverablePopup,
  lastOpenChangeReason: (state: State<unknown>) => state.openChangeReason,
  closeDelay: (state: State<unknown>) => state.closeDelay,
  hasViewport: (state: State<unknown>) => state.hasViewport,
};

export function TooltipStore<Payload>(initialState?: Partial<State<Payload>>) {
  const [state, setState] = createInitialState(initialState);
  const store = SolidStore<State<Payload>, Context, typeof selectors>(
    [state, setState],
    {
      popupRef: { current: null },
      onOpenChange: undefined,
      onOpenChangeComplete: undefined,
      triggerElements: new PopupTriggerMap(),
      floatingRootContext: getEmptyRootContext(),
    },
    selectors,
  );

  function setOpen(
    nextOpen: boolean,
    eventDetails: Omit<TooltipRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) {
    const reason = eventDetails.reason;

    const isHover = reason === REASONS.triggerHover;
    const isFocusOpen = nextOpen && reason === REASONS.triggerFocus;
    const isDismissClose =
      !nextOpen && (reason === REASONS.triggerPress || reason === REASONS.escapeKey);

    (eventDetails as TooltipRoot.ChangeEventDetails).preventUnmountOnClose = () => {
      store.set('preventUnmountingOnClose', true);
    };

    store.context.onOpenChange?.(nextOpen, eventDetails as TooltipRoot.ChangeEventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    const changeState = () => {
      const updatedState: Partial<State<Payload>> = { open: nextOpen, openChangeReason: reason };

      if (isFocusOpen) {
        updatedState.instantType = 'focus';
      } else if (isDismissClose) {
        updatedState.instantType = 'dismiss';
      } else if (reason === REASONS.triggerHover) {
        updatedState.instantType = undefined;
      }

      // If a popup is closing, the `trigger` may be null.
      // We want to keep the previous value so that exit animations are played and focus is returned correctly.
      const newTriggerId = eventDetails.trigger?.id ?? null;
      if (newTriggerId || nextOpen) {
        updatedState.activeTriggerId = newTriggerId;
        updatedState.activeTriggerElement = eventDetails.trigger ?? null;
      }

      store.update(updatedState);
    };

    if (isHover) {
      // If a hover reason is provided, we need to flush the state synchronously. This ensures
      // `node.getAnimations()` knows about the new state.
      changeState();
    } else {
      changeState();
    }
  }

  const merged = solidMergeProps(store, { setOpen });

  return merged;
}

export type TooltipStore<Payload> = ReturnType<typeof TooltipStore<Payload>>;

TooltipStore.useStore = <_Payload>(
  externalStore: TooltipStore<_Payload> | undefined,
  _initialState: Partial<State<_Payload>>,
): TooltipStore<_Payload> => {
  const store = externalStore ?? TooltipStore<_Payload>(_initialState);
  const floatingRootContext = useSyncedFloatingRootContext({
    popupStore: store,
    onOpenChange: store.setOpen,
  });
  store.context.floatingRootContext = floatingRootContext;
  return store;
};

function createInitialState<Payload>(initialState: Partial<State<Payload>> = {}) {
  return createInitialPopupStoreState<Payload, State<Payload>>({
    disabled: false,
    instantType: undefined,
    isInstantPhase: false,
    trackCursorAxis: 'none',
    disableHoverablePopup: false,
    openChangeReason: null,
    closeDelay: 0,
    hasViewport: false,
    ...initialState,
  });
}
