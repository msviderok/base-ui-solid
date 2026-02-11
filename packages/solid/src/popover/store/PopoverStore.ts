import { onMount } from 'solid-js';
import { PATIENT_CLICK_THRESHOLD } from '../../utils/constants';
import {
  createInitialPopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupStoreState,
  PopupTriggerMap,
} from '../../utils/popups';
import { REASONS } from '../../utils/reasons';
import { SolidStore } from '../../utils/store/SolidStore';
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
  readonly refs: {
    popupRef: HTMLElement | null | undefined;
    backdropRef: HTMLDivElement | null | undefined;
    internalBackdropRef: HTMLDivElement | null | undefined;
    triggerFocusTargetRef: HTMLElement | null | undefined;
    beforeContentFocusGuardRef: HTMLElement | null | undefined;
  };
  readonly stickIfOpenTimeout: Timeout;
};

function createInitialState<Payload>(): State<Payload> {
  return {
    ...createInitialPopupStoreState(),
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
  };
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

export class PopoverStore<Payload> extends SolidStore<
  Readonly<State<Payload>>,
  Context,
  Selectors
> {
  constructor(initialState?: Partial<State<Payload>>) {
    const initial = { ...createInitialState<Payload>(), ...initialState };

    if (initial.open && initialState?.mounted === undefined) {
      initial.mounted = true;
    }

    super(
      initial,
      {
        refs: {
          popupRef: undefined,
          backdropRef: undefined,
          internalBackdropRef: undefined,
          triggerFocusTargetRef: undefined,
          beforeContentFocusGuardRef: undefined,
        },
        onOpenChange: undefined,
        onOpenChangeComplete: undefined,
        stickIfOpenTimeout: useTimeout(),
        triggerElements: new PopupTriggerMap(),
      },
      selectors,
    );
  }

  setOpen = (
    nextOpen: boolean,
    eventDetails: Omit<PopoverRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) => {
    const isHover = eventDetails.reason === REASONS.triggerHover;
    const isKeyboardClick =
      eventDetails.reason === REASONS.triggerPress &&
      (eventDetails.event as MouseEvent).detail === 0;
    const isDismissClose =
      !nextOpen && (eventDetails.reason === REASONS.escapeKey || eventDetails.reason == null);

    (eventDetails as PopoverRoot.ChangeEventDetails).preventUnmountOnClose = () => {
      this.set('preventUnmountingOnClose', true);
    };

    this.context.onOpenChange?.(nextOpen, eventDetails as PopoverRoot.ChangeEventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    const details: FloatingUIOpenChangeDetails = {
      open: nextOpen,
      nativeEvent: eventDetails.event,
      reason: eventDetails.reason,
      nested: this.state.nested,
      triggerElement: eventDetails.trigger,
    };

    const floatingEvents = this.state.floatingRootContext.context.events;
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

      this.update(updatedState);
    };

    if (isHover) {
      // Only allow "patient" clicks to close the popover if it's open.
      // If they clicked within 500ms of the popover opening, keep it open.
      this.set('stickIfOpen', true);
      this.context.stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
        this.set('stickIfOpen', false);
      });

      changeState();
    } else {
      changeState();
    }

    if (isKeyboardClick || isDismissClose) {
      this.set('instantType', isKeyboardClick ? 'click' : 'dismiss');
    } else if (eventDetails.reason === REASONS.focusOut) {
      this.set('instantType', 'focus');
    } else {
      this.set('instantType', undefined);
    }
  };

  public static useStore<Payload>(
    externalStore: PopoverStore<Payload> | undefined,
    initialState: Partial<State<Payload>>,
  ) {
    const store = externalStore ?? new PopoverStore<Payload>(initialState);

    onMount(store.disposeEffect);
    return store;
  }

  private disposeEffect = () => {
    return this.context.stickIfOpenTimeout.clear();
  };
}

type Selectors = typeof selectors;
