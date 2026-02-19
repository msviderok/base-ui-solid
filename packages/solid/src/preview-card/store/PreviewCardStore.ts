import { useSyncedFloatingRootContext } from '../../floating-ui-solid';
import {
  createInitialPopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupStoreState,
  PopupTriggerMap,
} from '../../utils/popups';
import { REASONS } from '../../utils/reasons';
import { SolidStore } from '../../utils/store/SolidStore';
import { type PreviewCardRoot } from '../root/PreviewCardRoot';
import { CLOSE_DELAY } from '../utils/constants';

export type State<Payload> = PopupStoreState<Payload> & {
  instantType: 'dismiss' | 'focus' | undefined;
  hasViewport: boolean;
};

export type Context = Omit<PopupStoreContext<PreviewCardRoot.ChangeEventDetails>, 'refs'> & {
  readonly refs: PopupStoreContext<PreviewCardRoot.ChangeEventDetails>['refs'] & {
    closeDelayRef: number;
  };
};

const selectors = {
  ...popupStoreSelectors,
  instantType: (state: State<unknown>) => state.instantType,
  hasViewport: (state: State<unknown>) => state.hasViewport,
};

export class PreviewCardStore<Payload> extends SolidStore<
  State<Payload>,
  Context,
  typeof selectors
> {
  constructor(initialState?: Partial<State<Payload>>) {
    super(
      createInitialState(initialState),
      {
        refs: {
          popupRef: null,
          closeDelayRef: CLOSE_DELAY,
        },
        onOpenChange: undefined,
        onOpenChangeComplete: undefined,
        triggerElements: new PopupTriggerMap(),
      },
      selectors,
    );
  }

  public setOpen = (
    nextOpen: boolean,
    eventDetails: Omit<PreviewCardRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) => {
    const reason = eventDetails.reason;

    const isHover = reason === REASONS.triggerHover;
    const isFocusOpen = nextOpen && reason === REASONS.triggerFocus;
    const isDismissClose =
      !nextOpen && (reason === REASONS.triggerPress || reason === REASONS.escapeKey);

    (eventDetails as PreviewCardRoot.ChangeEventDetails).preventUnmountOnClose = () => {
      this.set('preventUnmountingOnClose', true);
    };

    this.context.onOpenChange?.(nextOpen, eventDetails as PreviewCardRoot.ChangeEventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    const changeState = () => {
      const updatedState: Partial<State<Payload>> = { open: nextOpen };

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

      this.update(updatedState);
    };

    if (isHover) {
      // If a hover reason is provided, we need to flush the state synchronously. This ensures
      // `node.getAnimations()` knows about the new state.
      changeState();
    } else {
      changeState();
    }
  };

  public static useStore<Payload>(
    externalStore: PreviewCardStore<Payload> | undefined,
    initialState?: Partial<State<Payload>>,
  ) {
    const internalStore = new PreviewCardStore<Payload>(initialState);

    const store = externalStore ?? internalStore;

    const floatingRootContext = useSyncedFloatingRootContext({
      popupStore: store,
      onOpenChange: store.setOpen,
    });

    // It's safe to set this here because when this code runs for the first time,
    // nothing has had a chance to subscribe to the `store` yet.
    // For subsequent renders, the `floatingRootContext` reference remains the same,
    // so it's basically a no-op.
    // (store.state as State<Payload>).floatingRootContext = floatingRootContext;
    store.setState('floatingRootContext', floatingRootContext);
    return store;
  }
}

function createInitialState<Payload>(initialState: Partial<State<Payload>> = {}) {
  return createInitialPopupStoreState<Payload, State<Payload>>({
    instantType: undefined,
    hasViewport: false,
    ...initialState,
  });
}
