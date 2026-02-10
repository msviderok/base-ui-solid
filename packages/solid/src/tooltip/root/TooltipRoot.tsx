import { createEffect, createMemo, onMount, type JSX } from 'solid-js';
import { useClientPoint, useDismiss, useFocus, useInteractions } from '../../floating-ui-solid';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '../../utils/createBaseUIEventDetails';
import {
  useImplicitActiveTrigger,
  useOpenStateTransitions,
  type PayloadChildRenderFunction,
} from '../../utils/popups';
import { REASONS } from '../../utils/reasons';
import { type TooltipHandle } from '../store/TooltipHandle';
import { TooltipStore } from '../store/TooltipStore';
import { TooltipRootContext } from './TooltipRootContext';

/**
 * Groups all parts of the tooltip.
 * Doesn’t render its own HTML element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipRoot<Payload>(props: TooltipRoot.Props<Payload>) {
  const disabled = () => props.disabled ?? false;
  const defaultOpen = () => props.defaultOpen ?? false;
  const openProp = () => props.open;
  const disableHoverablePopup = () => props.disableHoverablePopup ?? false;
  const trackCursorAxis = () => props.trackCursorAxis ?? 'none';
  const triggerIdProp = () => props.triggerId;
  const defaultTriggerIdProp = () => props.defaultTriggerId ?? null;

  const store = TooltipStore.useStore<Payload>(props.handle?.store, {
    get open() {
      return openProp() ?? defaultOpen();
    },
    get activeTriggerId() {
      return triggerIdProp() !== undefined ? triggerIdProp() : defaultTriggerIdProp();
    },
  });

  store.useControlledProp('open', openProp, defaultOpen);
  store.useControlledProp('activeTriggerId', triggerIdProp, defaultTriggerIdProp);

  store.useContextCallback('onOpenChange', props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', props.onOpenChangeComplete);

  const openState = store.useState('open');

  const activeTriggerId = store.useState('activeTriggerId');
  const payload = store.useState('payload') as Payload | undefined;

  store.useSyncedValues({
    get trackCursorAxis() {
      return trackCursorAxis();
    },
    get disableHoverablePopup() {
      return disableHoverablePopup();
    },
  });

  const open = () => !disabled() && openState();

  createEffect(() => {
    if (openState() && disabled()) {
      store.setOpen(false, createChangeEventDetails(REASONS.disabled));
    }
  });

  store.useSyncedValue('disabled', disabled);

  useImplicitActiveTrigger(store);
  const { forceUnmount, transitionStatus } = useOpenStateTransitions(open, store);
  const isInstantPhase = store.useState('isInstantPhase');
  const instantType = store.useState('instantType');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');

  // Animations should be instant in two cases:
  // 1) Opening during the provider's instant phase (adjacent tooltip opens instantly)
  // 2) Closing because another tooltip opened (reason === 'none')
  // Otherwise, allow the animation to play. In particular, do not disable animations
  // during the 'ending' phase unless it's due to a sibling opening.
  let previousInstantTypeRef = null as string | undefined | null;
  createEffect(() => {
    if (
      (transitionStatus() === 'ending' && lastOpenChangeReason() === REASONS.none) ||
      (transitionStatus() !== 'ending' && isInstantPhase())
    ) {
      // Capture the current instant type so we can restore it later
      // and set to 'delay' to disable animations while moving from one trigger to another
      // within a delay group.
      if (instantType() !== 'delay') {
        previousInstantTypeRef = instantType();
      }
      store.set('instantType', 'delay');
    } else if (previousInstantTypeRef !== null) {
      store.set('instantType', previousInstantTypeRef);
      previousInstantTypeRef = null;
    }
  });

  createEffect(() => {
    if (open()) {
      if (activeTriggerId() == null) {
        store.set('payload', undefined);
      }
    }
  });

  const handleImperativeClose = () => {
    store.setOpen(false, createTooltipEventDetails(store, REASONS.imperativeAction));
  };

  onMount(() => {
    props.actionsRef = { unmount: forceUnmount, close: handleImperativeClose };
  });

  const floatingRootContext = store.select('floatingRootContext');

  const focus = useFocus(floatingRootContext, { enabled: () => !disabled() });
  const dismiss = useDismiss(floatingRootContext, {
    enabled: () => !disabled(),
    referencePress: true,
  });
  const clientPoint = useClientPoint(floatingRootContext, {
    enabled: () => !disabled() && trackCursorAxis() !== 'none',
    axis: () => {
      const axis = trackCursorAxis();
      return axis === 'none' ? undefined : axis;
    },
  });

  const { getReferenceProps, getFloatingProps, getTriggerProps } = useInteractions([
    focus,
    dismiss,
    clientPoint,
  ]);

  const activeTriggerProps = createMemo(() => getReferenceProps());
  const inactiveTriggerProps = createMemo(() => getTriggerProps());
  const popupProps = createMemo(() => getFloatingProps());

  store.useSyncedValues({
    floatingRootContext,
    activeTriggerProps,
    inactiveTriggerProps,
    popupProps,
  });

  return (
    <TooltipRootContext.Provider value={store as TooltipRootContext}>
      {typeof props.children === 'function' ? props.children({ payload }) : props.children}
    </TooltipRootContext.Provider>
  );
}

function createTooltipEventDetails<P>(
  store: TooltipStore<P>,
  reason: TooltipRoot.ChangeEventReason,
) {
  const details: TooltipRoot.ChangeEventDetails =
    createChangeEventDetails<TooltipRoot.ChangeEventReason>(
      reason,
    ) as TooltipRoot.ChangeEventDetails;
  details.preventUnmountOnClose = () => {
    store.set('preventUnmountingOnClose', true);
  };
  return details;
}

export interface TooltipRootState {}

export interface TooltipRootProps<Payload = unknown> {
  /**
   * Whether the tooltip is initially open.
   *
   * To render a controlled tooltip, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * Whether the tooltip is currently open.
   */
  open?: boolean;
  /**
   * Event handler called when the tooltip is opened or closed.
   */
  onOpenChange?: (open: boolean, eventDetails: TooltipRoot.ChangeEventDetails) => void;
  /**
   * Event handler called after any animations complete when the tooltip is opened or closed.
   */
  onOpenChangeComplete?: (open: boolean) => void;
  /**
   * Whether the tooltip contents can be hovered without closing the tooltip.
   * @default false
   */
  disableHoverablePopup?: boolean;
  /**
   * Determines which axis the tooltip should track the cursor on.
   * @default 'none'
   */
  trackCursorAxis?: 'none' | 'x' | 'y' | 'both';
  /**
   * A ref to imperative actions.
   * - `unmount`: When specified, the tooltip will not be unmounted when closed.
   * Instead, the `unmount` function must be called to unmount the tooltip manually.
   * Useful when the tooltip's animation is controlled by an external library.
   * - `close`: Closes the dialog imperatively when called.
   */
  actionsRef?: TooltipRoot.Actions;
  /**
   * Whether the tooltip is disabled.
   * @default false
   */
  disabled?: boolean;
  /**
   * A handle to associate the tooltip with a trigger.
   * If specified, allows external triggers to control the tooltip's open state.
   * Can be created with the Tooltip.createHandle() method.
   */
  handle?: TooltipHandle<Payload>;
  /**
   * The content of the tooltip.
   * This can be a regular React node or a render function that receives the `payload` of the active trigger.
   */
  children?: JSX.Element | PayloadChildRenderFunction<Payload>;
  /**
   * ID of the trigger that the tooltip is associated with.
   * This is useful in conjuntion with the `open` prop to create a controlled tooltip.
   * There's no need to specify this prop when the tooltip is uncontrolled (i.e. when the `open` prop is not set).
   */
  triggerId?: string | null;
  /**
   * ID of the trigger that the tooltip is associated with.
   * This is useful in conjunction with the `defaultOpen` prop to create an initially open tooltip.
   */
  defaultTriggerId?: string | null;
}

export interface TooltipRootActions {
  unmount: () => void;
  close: () => void;
}

export type TooltipRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.disabled
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type TooltipRootChangeEventDetails =
  BaseUIChangeEventDetails<TooltipRoot.ChangeEventReason> & {
    preventUnmountOnClose(): void;
  };

export namespace TooltipRoot {
  export type State = TooltipRootState;
  export type Props<Payload = unknown> = TooltipRootProps<Payload>;
  export type Actions = TooltipRootActions;
  export type ChangeEventReason = TooltipRootChangeEventReason;
  export type ChangeEventDetails = TooltipRootChangeEventDetails;
}
