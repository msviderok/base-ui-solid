import { SolidStore } from '@msviderok/base-ui-solid/utils/store/SolidStore';
import { createStore } from 'solid-js/store';
import { access, type MaybeAccessor } from '../../solid-helpers';
import type { BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import type { PopupTriggerMap } from '../../utils/popups';
import type { FloatingUIOpenChangeDetails } from '../../utils/types';
import type { ContextData, FloatingEvents, ReferenceType } from '../types';
import { createEventEmitter } from '../utils/createEventEmitter';
import { isClickLikeEvent } from '../utils/event';

export interface FloatingRootState {
  open: boolean;
  domReferenceElement: Element | null | undefined;
  referenceElement: ReferenceType | null | undefined;
  floatingElement: HTMLElement | null | undefined;
  positionReference: ReferenceType | null | undefined;
  /** The ID of the floating element. */
  floatingId: string | undefined;
}

export interface FloatingRootStoreContext {
  onOpenChange:
    | ((open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void)
    | undefined;
  readonly dataRef: ContextData;
  readonly events: FloatingEvents;
  nested: boolean;
  noEmit: boolean;
  readonly triggerElements: PopupTriggerMap;
}

const selectors = {
  open: (state: FloatingRootState) => state.open,
  domReferenceElement: (state: FloatingRootState) => state.domReferenceElement,
  referenceElement: (state: FloatingRootState) => state.positionReference ?? state.referenceElement,
  floatingElement: (state: FloatingRootState) => state.floatingElement,
  floatingId: (state: FloatingRootState) => state.floatingId,
};

interface FloatingRootStoreOptions {
  open: boolean;
  referenceElement: ReferenceType | null | undefined;
  floatingElement: HTMLElement | null | undefined;
  floatingId: string | undefined;
  /** Non-reactive */
  triggerElements: PopupTriggerMap;
  /** Non-reactive */
  nested: boolean;
  /** Non-reactive */
  noEmit: boolean;
  onOpenChange:
    | ((open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void)
    | undefined;
}

export class FloatingRootStore extends SolidStore<
  FloatingRootState,
  FloatingRootStoreContext,
  typeof selectors
> {
  constructor(options: FloatingRootStoreOptions) {
    const [state, setState] = createStore<FloatingRootState>({
      open: options.open,
      referenceElement: options.referenceElement,
      floatingElement: options.floatingElement,
      floatingId: options.floatingId,
      positionReference: options.referenceElement,
      domReferenceElement: options.referenceElement as Element | null | undefined,
    });
    super(
      [state, setState],
      {
        onOpenChange: options.onOpenChange,
        dataRef: {},
        events: createEventEmitter(),
        nested: options.nested,
        noEmit: options.noEmit,
        triggerElements: options.triggerElements,
      },
      selectors,
    );
  }

  /**
   * Emits the `openchange` event through the internal event emitter and calls the `onOpenChange` handler with the provided arguments.
   *
   * @param newOpen The new open state.
   * @param eventDetails Details about the event that triggered the open state change.
   */
  setOpen = (newOpen: boolean, eventDetails: BaseUIChangeEventDetails<string>) => {
    if (
      !newOpen ||
      !this.state.open ||
      // Prevent a pending hover-open from overwriting a click-open event, while allowing
      // click events to upgrade a hover-open.
      isClickLikeEvent(eventDetails.event)
    ) {
      this.context.dataRef.openEvent = newOpen ? eventDetails.event : undefined;
    }
    if (!this.context.noEmit) {
      const details: FloatingUIOpenChangeDetails = {
        open: newOpen,
        reason: eventDetails.reason,
        nativeEvent: eventDetails.event,
        nested: this.context.nested,
        triggerElement: eventDetails.trigger,
      };

      this.context.events.emit('openchange', details);
    }

    this.context.onOpenChange?.(newOpen, eventDetails);
  };
}
