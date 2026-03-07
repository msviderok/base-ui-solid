import { createEffect, createMemo, onMount, untrack, type Accessor, type JSX } from 'solid-js';
import { useDismiss, useInteractions, useSyncedFloatingRootContext } from '../../floating-ui-solid';
import { ComponentWithPayload, type ReactLikeRef } from '../../solid-helpers';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '../../utils/createBaseUIEventDetails';
import {
  PayloadChildRenderFunction,
  useImplicitActiveTrigger,
  useOpenStateTransitions,
} from '../../utils/popups';
import { REASONS } from '../../utils/reasons';
import { PreviewCardHandle } from '../store/PreviewCardHandle';
import { PreviewCardStore } from '../store/PreviewCardStore';
import { PreviewCardRootContext } from './PreviewCardContext';

/**
 * Groups all parts of the preview card.
 * Doesn’t render its own HTML element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardRoot<Payload>(props: PreviewCardRoot.Props<Payload>) {
  const openProp = () => props.open;
  const defaultOpen = () => props.defaultOpen ?? false;
  const triggerIdProp = () => props.triggerId;
  const defaultTriggerIdProp = () => props.defaultTriggerId ?? null;

  const store = PreviewCardStore.useStore<Payload>(
    untrack(() => props.handle?.store),
    {
      get open() {
        return defaultOpen();
      },
      get openProp() {
        return openProp();
      },
      get activeTriggerId() {
        return defaultTriggerIdProp();
      },
      get triggerIdProp() {
        return triggerIdProp();
      },
    },
  );

  // Support initially open state when uncontrolled
  onMount(() => {
    if (openProp() === undefined && store.state.open === false && defaultOpen() === true) {
      store.update({
        open: true,
        activeTriggerId: defaultTriggerIdProp(),
      });
    }
  });

  store.useControlledProp('openProp', openProp);
  store.useControlledProp('triggerIdProp', triggerIdProp);

  store.useContextCallback('onOpenChange', props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', props.onOpenChangeComplete);

  const open = store.useState('open');
  const activeTriggerId = store.useState('activeTriggerId');
  const payload = store.useState('payload') as Accessor<Payload | undefined>;

  useImplicitActiveTrigger({ store });
  const { forceUnmount } = useOpenStateTransitions({
    get open() {
      return open();
    },
    get store() {
      return store;
    },
  });

  createEffect(() => {
    if (open()) {
      if (activeTriggerId() == null) {
        store.set('payload', undefined);
      }
    }
  });

  const handleImperativeClose = () => {
    store.setOpen(false, createPreviewCardEventDetails(store, REASONS.imperativeAction));
  };

  onMount(() => {
    if (props.actionsRef) {
      props.actionsRef.current = { unmount: forceUnmount, close: handleImperativeClose };
    }
  });

  const dismiss = useDismiss({
    get context() {
      return store.context.floatingRootContext;
    },
  });

  const { getReferenceProps, getTriggerProps, getFloatingProps } = useInteractions([dismiss]);

  const activeTriggerProps = createMemo(() => getReferenceProps());
  const inactiveTriggerProps = createMemo(() => getTriggerProps());
  const popupProps = createMemo(() => getFloatingProps());

  store.useSyncedValues({
    activeTriggerProps,
    inactiveTriggerProps,
    popupProps,
  });

  const contextValue = { store } as PreviewCardRootContext;

  return (
    <PreviewCardRootContext.Provider value={contextValue}>
      <ComponentWithPayload payload={payload} children={props.children} />
    </PreviewCardRootContext.Provider>
  );
}

function createPreviewCardEventDetails<Payload>(
  store: PreviewCardStore<Payload>,
  reason: PreviewCardRoot.ChangeEventReason,
) {
  const details: PreviewCardRoot.ChangeEventDetails =
    createChangeEventDetails<PreviewCardRoot.ChangeEventReason>(
      reason,
    ) as PreviewCardRoot.ChangeEventDetails;
  details.preventUnmountOnClose = () => {
    store.set('preventUnmountingOnClose', true);
  };
  return details;
}

export interface PreviewCardRootState {}

export interface PreviewCardRootProps<Payload = unknown> {
  /**
   * Whether the preview card is initially open.
   *
   * To render a controlled preview card, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the preview card is currently open.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the preview card is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: PreviewCardRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Event handler called after any animations complete when the preview card is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: Unmounts the preview card popup.
   * - `close`: Closes the preview card imperatively when called.
   */
  actionsRef?: ReactLikeRef<PreviewCardRoot.Actions | null> | undefined;
  /**
   * A handle to associate the preview card with a trigger.
   * If specified, allows external triggers to control the card's open state.
   * Can be created with the PreviewCard.createHandle() method.
   */
  handle?: PreviewCardHandle<Payload> | undefined;
  /**
   * The content of the preview card.
   * This can be a regular React node or a render function that receives the `payload` of the active trigger.
   */
  children?: JSX.Element | PayloadChildRenderFunction<Payload>;
  /**
   * ID of the trigger that the preview card is associated with.
   * This is useful in conjuntion with the `open` prop to create a controlled preview card.
   * There's no need to specify this prop when the preview card is uncontrolled (i.e. when the `open` prop is not set).
   */
  triggerId?: (string | null) | undefined;
  /**
   * ID of the trigger that the preview card is associated with.
   * This is useful in conjunction with the `defaultOpen` prop to create an initially open preview card.
   */
  defaultTriggerId?: (string | null) | undefined;
}

export interface PreviewCardRootActions {
  unmount: () => void;
  close: () => void;
}

export type PreviewCardRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type PreviewCardRootChangeEventDetails =
  BaseUIChangeEventDetails<PreviewCardRoot.ChangeEventReason> & {
    preventUnmountOnClose(): void;
  };

export namespace PreviewCardRoot {
  export type State = PreviewCardRootState;
  export type Props<Payload = unknown> = PreviewCardRootProps<Payload>;
  export type Actions = PreviewCardRootActions;
  export type ChangeEventReason = PreviewCardRootChangeEventReason;
  export type ChangeEventDetails = PreviewCardRootChangeEventDetails;
}
