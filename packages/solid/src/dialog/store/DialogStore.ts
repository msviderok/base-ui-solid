import { mergeProps as solidMergeProps } from 'solid-js';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import type { ReactLikeRef } from '../../solid-helpers';
import {
  createInitialPopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupStoreState,
  PopupTriggerMap,
} from '../../utils/popups';
import { SolidStore } from '../../utils/store/SolidStoreV2';
import type { FloatingUIOpenChangeDetails } from '../../utils/types';
import { type InteractionType } from '../../utils/useEnhancedClickHandler';
import { type DialogRoot } from '../root/DialogRoot';

export type State<Payload> = PopupStoreState<Payload> & {
  modal: boolean | 'trap-focus';
  disablePointerDismissal: boolean;
  openMethod: InteractionType | null;
  nested: boolean;
  nestedOpenDialogCount: number;
  titleElementId: string | undefined;
  descriptionElementId: string | undefined;
  viewportElement: HTMLElement | null | undefined;
  role: 'dialog' | 'alertdialog';
};

type Context = PopupStoreContext<DialogRoot.ChangeEventDetails> & {
  readonly popupRef: ReactLikeRef<HTMLElement | null | undefined>;
  readonly backdropRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  readonly internalBackdropRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  readonly outsidePressEnabledRef: ReactLikeRef<boolean>;
  readonly onNestedDialogOpen?: ((ownChildrenCount: number) => void) | undefined;
  readonly onNestedDialogClose?: (() => void) | undefined;
};

const selectors = {
  ...popupStoreSelectors,
  modal: (state: State<unknown>) => state.modal,
  nested: (state: State<unknown>) => state.nested,
  nestedOpenDialogCount: (state: State<unknown>) => state.nestedOpenDialogCount,
  disablePointerDismissal: (state: State<unknown>) => state.disablePointerDismissal,
  openMethod: (state: State<unknown>) => state.openMethod,
  descriptionElementId: (state: State<unknown>) => state.descriptionElementId,
  titleElementId: (state: State<unknown>) => state.titleElementId,
  viewportElement: (state: State<unknown>) => state.viewportElement,
  role: (state: State<unknown>) => state.role,
};

export function DialogStore<Payload>(initialState?: Partial<State<Payload>>) {
  const [state, setState] = createInitialState<Payload>(initialState);
  const store = SolidStore<State<Payload>, Context, typeof selectors>(
    [state, setState],
    {
      popupRef: { current: null },
      backdropRef: { current: null },
      internalBackdropRef: { current: null },
      outsidePressEnabledRef: { current: true },
      triggerElements: new PopupTriggerMap(),
      onOpenChange: undefined,
      onOpenChangeComplete: undefined,
      floatingRootContext: getEmptyRootContext(),
    },
    selectors,
  );

  function setOpen(
    nextOpen: boolean,
    eventDetails: Omit<DialogRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) {
    (eventDetails as DialogRoot.ChangeEventDetails).preventUnmountOnClose = () => {
      store.set('preventUnmountingOnClose', true);
    };

    if (!nextOpen && eventDetails.trigger == null && store.state.activeTriggerId != null) {
      // When closing the dialog, pass the old trigger to the onOpenChange event
      // so it's not reset too early (potentially causing focus issues in controlled scenarios).
      eventDetails.trigger = store.state.activeTriggerElement ?? undefined;
    }

    store.context.onOpenChange?.(nextOpen, eventDetails as DialogRoot.ChangeEventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    const details: FloatingUIOpenChangeDetails = {
      open: nextOpen,
      nativeEvent: eventDetails.event,
      reason: eventDetails.reason,
      nested: store.state.nested,
    };

    store.context.floatingRootContext.context.events?.emit('openchange', details);

    const updatedState: Partial<State<Payload>> = {
      open: nextOpen,
    };

    // If a popup is closing, the `trigger` may be null.
    // We want to keep the previous value so that exit animations are played and focus is returned correctly.
    const newTriggerId = eventDetails.trigger?.id ?? null;
    if (newTriggerId || nextOpen) {
      updatedState.activeTriggerId = newTriggerId;
      updatedState.activeTriggerElement = eventDetails.trigger ?? null;
    }

    store.update(updatedState);
  }

  const merged = solidMergeProps(store, { setOpen });
  return merged;
}

function createInitialState<Payload>(initialState: Partial<State<Payload>> = {}) {
  return createInitialPopupStoreState<Payload, State<Payload>>({
    modal: true,
    disablePointerDismissal: false,
    popupElement: null,
    viewportElement: null,
    descriptionElementId: undefined,
    titleElementId: undefined,
    openMethod: null,
    nested: false,
    nestedOpenDialogCount: 0,
    role: 'dialog',
    ...initialState,
  });
}

export type DialogStore<Payload> = ReturnType<typeof DialogStore<Payload>>;
