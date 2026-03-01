import { onMount, mergeProps as solidMergeProps } from 'solid-js';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import { type ReactLikeRef } from '../../solid-helpers';
import { PATIENT_CLICK_THRESHOLD } from '../../utils/constants';
import {
  createInitialPopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupStoreState,
  PopupTriggerMap,
} from '../../utils/popups';
import { REASONS } from '../../utils/reasons';
import { SolidStore } from '../../utils/store/SolidStoreV2';
import { FloatingUIOpenChangeDetails } from '../../utils/types';
import { type InteractionType } from '../../utils/useEnhancedClickHandler';
import { Timeout, useTimeout } from '../../utils/useTimeout';
import { PopoverRoot } from './../root/PopoverRoot';

export type State<Payload> = PopupStoreState<Payload> & {
  disabled: boolean;
  instantType: 'dismiss' | 'click' | undefined;
  modal: boolean | 'trap-focus';
  openMethod: InteractionType | null;
  openChangeReason: PopoverRoot.ChangeEventReason | null;
  stickIfOpen: boolean;
  nested: boolean;
  titleElementId: string | undefined;
  descriptionElementId: string | undefined;
  openOnHover: boolean;
  closeDelay: number;
  hasViewport: boolean;
};

type Context = PopupStoreContext<PopoverRoot.ChangeEventDetails> & {
  readonly popupRef: ReactLikeRef<HTMLElement | null | undefined>;
  readonly backdropRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  readonly internalBackdropRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  readonly triggerFocusTargetRef: ReactLikeRef<HTMLElement | null | undefined>;
  readonly beforeContentFocusGuardRef: ReactLikeRef<HTMLElement | null | undefined>;
  readonly stickIfOpenTimeout: Timeout;
};

function createInitialState<Payload>(initialState?: Partial<State<Payload>>) {
  return createInitialPopupStoreState<Payload, State<Payload>>({
    disabled: false,
    modal: false,
    instantType: undefined,
    openMethod: null,
    openChangeReason: null,
    titleElementId: undefined,
    descriptionElementId: undefined,
    stickIfOpen: true,
    nested: false,
    openOnHover: false,
    closeDelay: 0,
    hasViewport: false,
    ...initialState,
    mounted:
      initialState?.open && initialState?.mounted === undefined ? true : initialState?.mounted,
  });
}

const selectors = {
  ...popupStoreSelectors,
  disabled: (state: State<unknown>) => state.disabled,
  instantType: (state: State<unknown>) => state.instantType,
  openMethod: (state: State<unknown>) => state.openMethod,
  openChangeReason: (state: State<unknown>) => state.openChangeReason,
  modal: (state: State<unknown>) => state.modal,
  stickIfOpen: (state: State<unknown>) => state.stickIfOpen,
  titleElementId: (state: State<unknown>) => state.titleElementId,
  descriptionElementId: (state: State<unknown>) => state.descriptionElementId,
  openOnHover: (state: State<unknown>) => state.openOnHover,
  closeDelay: (state: State<unknown>) => state.closeDelay,
  hasViewport: (state: State<unknown>) => state.hasViewport,
};

export function PopoverStore<Payload>(initialState?: Partial<State<Payload>>) {
  const [state, setState] = createInitialState(initialState);
  const store = SolidStore<State<Payload>, Context, typeof selectors>(
    [state, setState],
    {
      popupRef: { current: null },
      backdropRef: { current: null },
      internalBackdropRef: { current: null },
      triggerFocusTargetRef: { current: null },
      beforeContentFocusGuardRef: { current: null },
      onOpenChange: undefined,
      onOpenChangeComplete: undefined,
      stickIfOpenTimeout: useTimeout(),
      triggerElements: new PopupTriggerMap(),
      floatingRootContext: getEmptyRootContext(),
    },
    selectors,
  );

  function setOpen(
    nextOpen: boolean,
    eventDetails: Omit<PopoverRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) {
    const isHover = eventDetails.reason === REASONS.triggerHover;
    const isKeyboardClick =
      eventDetails.reason === REASONS.triggerPress &&
      (eventDetails.event as MouseEvent).detail === 0;
    const isDismissClose =
      !nextOpen && (eventDetails.reason === REASONS.escapeKey || eventDetails.reason == null);

    (eventDetails as PopoverRoot.ChangeEventDetails).preventUnmountOnClose = () => {
      store.set('preventUnmountingOnClose', true);
    };

    store.context.onOpenChange?.(nextOpen, eventDetails as PopoverRoot.ChangeEventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    const details: FloatingUIOpenChangeDetails = {
      open: nextOpen,
      nativeEvent: eventDetails.event,
      reason: eventDetails.reason,
      nested: store.state.nested,
      triggerElement: eventDetails.trigger,
    };

    const floatingEvents = store.context.floatingRootContext.context.events;
    floatingEvents?.emit('openchange', details);

    const changeState = () => {
      const updatedState: Partial<State<Payload>> = {
        open: nextOpen,
        openChangeReason: eventDetails.reason,
      };

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
      // Only allow "patient" clicks to close the popover if it's open.
      // If they clicked within 500ms of the popover opening, keep it open.
      store.set('stickIfOpen', true);
      store.context.stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
        store.set('stickIfOpen', false);
      });

      changeState();
    } else {
      changeState();
    }

    if (isKeyboardClick || isDismissClose) {
      store.set('instantType', isKeyboardClick ? 'click' : 'dismiss');
    } else if (eventDetails.reason === REASONS.focusOut) {
      store.set('instantType', 'focus' as any);
    } else {
      store.set('instantType', undefined);
    }
  }

  function disposeEffect() {
    return store.context.stickIfOpenTimeout.clear();
  }

  onMount(() => {
    disposeEffect();
  });

  const merged = solidMergeProps(store, { setOpen, disposeEffect });
  return merged;
}

export type PopoverStore<Payload> = ReturnType<typeof PopoverStore<Payload>>;

PopoverStore.useStore = <Payload>(
  externalStore: PopoverStore<Payload> | undefined,
  initialState: Partial<State<Payload>>,
) => {
  if (externalStore) {
    return externalStore;
  }

  const internalStore = PopoverStore(initialState);
  onMount(() => {
    internalStore.disposeEffect();
  });
  return internalStore;
};
