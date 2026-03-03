'use client';
import {
  createEffect,
  createMemo,
  onMount,
  Show,
  untrack,
  type Accessor,
  type JSX,
} from 'solid-js';
import {
  FloatingTree,
  useDismiss,
  useFloatingParentNodeId,
  useInteractions,
  useRole,
  useSyncedFloatingRootContext,
} from '../../floating-ui-solid';
import { ComponentWithPayload, type ReactLikeRef } from '../../solid-helpers';
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
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import { useScrollLock } from '../../utils/useScrollLock';
import { PopoverHandle } from '../store/PopoverHandle';
import { PopoverStore } from '../store/PopoverStore';
import { PopoverRootContext, usePopoverRootContext } from './PopoverRootContext';

function PopoverRootComponent<Payload>(props: PopoverRoot.Props<Payload>) {
  const openProp = () => props.open;
  const defaultOpen = () => props.defaultOpen ?? false;
  const modal = () => props.modal ?? false;
  const triggerIdProp = () => props.triggerId;
  const defaultTriggerIdProp = () => props.defaultTriggerId ?? null;

  const store = PopoverStore.useStore(
    untrack(() => props.handle?.store),
    {
      get modal() {
        return modal();
      },
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

  const open = store.useState('open');
  const positionerElement = store.useState('positionerElement');
  const payload = store.useState('payload') as Accessor<Payload | undefined>;
  const openReason = store.useState('openChangeReason');

  store.useContextCallback('onOpenChange', props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', props.onOpenChangeComplete);

  const {
    openMethod,
    triggerProps: interactionTypeTriggerProps,
    reset: resetOpenInteractionType,
  } = useOpenInteractionType(open);

  useImplicitActiveTrigger({ store });
  const { forceUnmount } = useOpenStateTransitions({
    get open() {
      return open();
    },
    store,
    onUnmount: () => {
      store.update({ stickIfOpen: true, openChangeReason: null });
      resetOpenInteractionType();
    },
  });

  useScrollLock({
    enabled: () =>
      open() &&
      modal() === true &&
      openReason() !== REASONS.triggerHover &&
      openMethod() !== 'touch',
    referenceElement: positionerElement,
  });

  createEffect(() => {
    if (!open()) {
      store.context.stickIfOpenTimeout.clear();
    }
  });

  const createPopoverEventDetails = (reason: PopoverRoot.ChangeEventReason) => {
    const details: PopoverRoot.ChangeEventDetails =
      createChangeEventDetails<PopoverRoot.ChangeEventReason>(
        reason,
      ) as PopoverRoot.ChangeEventDetails;
    details.preventUnmountOnClose = () => {
      store.set('preventUnmountingOnClose', true);
    };

    return details;
  };

  const handleImperativeClose = () => {
    store.setOpen(false, createPopoverEventDetails(REASONS.imperativeAction));
  };

  onMount(() => {
    if (props.actionsRef) {
      props.actionsRef.current = { unmount: forceUnmount, close: handleImperativeClose };
    }
  });

  const floatingRootContext = useSyncedFloatingRootContext({
    popupStore: store,
    onOpenChange: store.setOpen,
  });
  store.context.floatingRootContext = floatingRootContext;

  const dismiss = useDismiss({
    context: floatingRootContext,
    props: {
      outsidePressEvent: {
        // Ensure `aria-hidden` on outside elements is removed immediately
        // on outside press when trapping focus.
        get mouse() {
          return modal() === 'trap-focus' ? 'sloppy' : 'intentional';
        },
        touch: 'sloppy',
      },
    },
  });

  const role = useRole({ context: floatingRootContext });

  const { getReferenceProps, getFloatingProps, getTriggerProps } = useInteractions([dismiss, role]);

  const activeTriggerProps = createMemo(() => getReferenceProps(interactionTypeTriggerProps));
  const inactiveTriggerProps = createMemo(() => getTriggerProps(interactionTypeTriggerProps));
  const popupProps = createMemo(() => getFloatingProps());
  const nested = createMemo(() => useFloatingParentNodeId() != null);

  store.useSyncedValues({
    modal,
    openMethod,
    activeTriggerProps,
    inactiveTriggerProps,
    popupProps,
    nested,
  });

  const popoverContext: PopoverRootContext<Payload> = { store };

  return (
    <PopoverRootContext.Provider value={popoverContext as PopoverRootContext<unknown>}>
      <ComponentWithPayload payload={payload} children={props.children} />
    </PopoverRootContext.Provider>
  );
}

/**
 * Groups all parts of the popover.
 * Doesn’t render its own HTML element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverRoot<Payload = unknown>(props: PopoverRoot.Props<Payload>) {
  const context = usePopoverRootContext(true);

  return (
    <Show
      when={context}
      fallback={
        <FloatingTree>
          <PopoverRootComponent {...props} />
        </FloatingTree>
      }
    >
      <PopoverRootComponent {...props} />
    </Show>
  );
}

export interface PopoverRootState {}

export interface PopoverRootProps<Payload = unknown> {
  /**
   * Whether the popover is initially open.
   *
   * To render a controlled popover, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the popover is currently open.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the popover is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: PopoverRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Event handler called after any animations complete when the popover is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: When specified, the popover will not be unmounted when closed.
   * Instead, the `unmount` function must be called to unmount the popover manually.
   * Useful when the popover's animation is controlled by an external library.
   * - `close`: Closes the dialog imperatively when called.
   */
  actionsRef?: ReactLikeRef<PopoverRoot.Actions | null> | undefined;
  /**
   * Determines if the popover enters a modal state when open.
   * - `true`: user interaction is limited to the popover: document page scroll is locked, and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   * - `'trap-focus'`: focus is trapped inside the popover, but document page scroll is not locked and pointer interactions outside of it remain enabled.
   * @default false
   */
  modal?: (boolean | 'trap-focus') | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjuntion with the `open` prop to create a controlled popover.
   * There's no need to specify this prop when the popover is uncontrolled (i.e. when the `open` prop is not set).
   */
  triggerId?: (string | null) | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjuntion with the `defaultOpen` prop to create an initially open popover.
   */
  defaultTriggerId?: (string | null) | undefined;
  /**
   * A handle to associate the popover with a trigger.
   * If specified, allows external triggers to control the popover's open state.
   */
  handle?: PopoverHandle<Payload> | undefined;
  /**
   * The content of the popover.
   * This can be a regular React node or a render function that receives the `payload` of the active trigger.
   */
  children?: JSX.Element | PayloadChildRenderFunction<Payload>;
}

export interface PopoverRootActions {
  unmount: () => void;
  close: () => void;
}

export type PopoverRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.closePress
  | typeof REASONS.focusOut
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;
export type PopoverRootChangeEventDetails =
  BaseUIChangeEventDetails<PopoverRoot.ChangeEventReason> & {
    preventUnmountOnClose(): void;
  };

export namespace PopoverRoot {
  export type State = PopoverRootState;
  export type Props<Payload = unknown> = PopoverRootProps<Payload>;
  export type Actions = PopoverRootActions;
  export type ChangeEventReason = PopoverRootChangeEventReason;
  export type ChangeEventDetails = PopoverRootChangeEventDetails;
}
