import {
  createEffect,
  createMemo,
  onCleanup,
  onMount,
  Show,
  untrack,
  type Accessor,
  type JSX,
} from 'solid-js';
import {
  ContextMenuRootContext,
  useContextMenuRootContext,
} from '../../context-menu/root/ContextMenuRootContext';
import { useDirection } from '../../direction-provider/DirectionContext';
import {
  FloatingEvents,
  FloatingTree,
  useDismiss,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingTree,
  useInteractions,
  useListNavigation,
  useRole,
  useSyncedFloatingRootContext,
  useTypeahead,
} from '../../floating-ui-solid';
import { MenubarContext, useMenubarContext } from '../../menubar/MenubarContext';
import { mergeProps } from '../../merge-props';
import { ComponentWithPayload, type ReactLikeRef } from '../../solid-helpers';
import { TYPEAHEAD_RESET_MS } from '../../utils/constants';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '../../utils/createBaseUIEventDetails';
import { EMPTY_ARRAY } from '../../utils/empty';
import {
  PayloadChildRenderFunction,
  useImplicitActiveTrigger,
  useOpenStateTransitions,
} from '../../utils/popups';
import { REASONS } from '../../utils/reasons';
import type { FloatingUIOpenChangeDetails } from '../../utils/types';
import { useId } from '../../utils/useId';
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import { useScrollLock } from '../../utils/useScrollLock';
import { useTimeout } from '../../utils/useTimeout';
import { MenuHandle } from '../store/MenuHandle';
import { MenuStore, State } from '../store/MenuStore';
import { useMenuSubmenuRootContext } from '../submenu-root/MenuSubmenuRootContext';
import { MenuRootContext, useMenuRootContext } from './MenuRootContext';

/**
 * Groups all parts of the menu.
 * Doesn’t render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuRoot<Payload>(props: MenuRoot.Props<Payload>) {
  const openProp = () => props.open;
  const defaultOpen = () => props.defaultOpen ?? false;
  const disabledProp = () => props.disabled ?? false;
  const modalProp = () => props.modal;
  const loopFocus = () => props.loopFocus ?? true;
  const orientation = () => props.orientation ?? 'vertical';
  const closeParentOnEsc = () => props.closeParentOnEsc ?? false;
  const triggerIdProp = () => props.triggerId;
  const defaultTriggerIdProp = () => props.defaultTriggerId ?? null;
  const highlightItemOnHover = () => props.highlightItemOnHover ?? true;

  const contextMenuContext = useContextMenuRootContext(true);
  const parentMenuRootContext = useMenuRootContext(true);
  const menubarContext = useMenubarContext(true);
  const isSubmenu = useMenuSubmenuRootContext();

  let parentFromContext: MenuParent = { type: undefined };
  if (isSubmenu && parentMenuRootContext) {
    parentFromContext = { type: 'menu', store: parentMenuRootContext.store };
  } else if (menubarContext) {
    parentFromContext = { type: 'menubar', context: menubarContext };
  } else if (contextMenuContext && !parentMenuRootContext) {
    // Ensure this is not a Menu nested inside ContextMenu.Trigger.
    // ContextMenu parentContext is always undefined as ContextMenu.Root is instantiated with
    // <MenuRootContext.Provider value={undefined}>
    parentFromContext = { type: 'context-menu', context: contextMenuContext };
  }

  const store = untrack(
    () =>
      props.handle?.store ??
      MenuStore(
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
        { parent: parentFromContext },
      ),
  ) as MenuStore<Payload>;

  const floatingTreeFromContext = useFloatingTree();
  if (floatingTreeFromContext) {
    store.context.floatingTreeRoot = floatingTreeFromContext;
  }

  store.useControlledProp('openProp', openProp);
  store.useControlledProp('triggerIdProp', triggerIdProp);
  store.useContextCallback(
    'onOpenChangeComplete',
    untrack(() => props.onOpenChangeComplete),
  );

  const floatingNodeIdFromContext = useFloatingNodeId(store.context.floatingTreeRoot);
  const floatingParentNodeIdFromContext = useFloatingParentNodeId();

  if (contextMenuContext && !parentMenuRootContext) {
    // This is a context menu root.
    // It doesn't support detached triggers yet, so we have to sync the parent context manually.
    store.context.parent = { type: 'context-menu', context: contextMenuContext };
    store.useSyncedValues({
      floatingNodeId: floatingNodeIdFromContext,
      floatingParentNodeId: floatingParentNodeIdFromContext,
    });
  } else if (parentMenuRootContext || menubarContext) {
    store.useSyncedValues({
      floatingNodeId: floatingNodeIdFromContext,
      floatingParentNodeId: floatingParentNodeIdFromContext,
    });
  }

  const open = store.useState('open');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const positionerElement = store.useState('positionerElement');
  const hoverEnabled = store.useState('hoverEnabled');
  const modal = store.useState('modal');
  const disabled = store.useState('disabled');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');

  const activeIndex = store.useState('activeIndex');
  const payload = store.useState('payload') as Accessor<Payload | undefined>;
  const floatingParentNodeId = store.useState('floatingParentNodeId');

  let openEventRef = null as Event | null;

  const nested = () => floatingParentNodeId() != null;

  let floatingEvents: FloatingEvents;

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      if (store.context.parent.type !== undefined && props.modal !== undefined) {
        console.warn(
          'Base UI: The `modal` prop is not supported on nested menus. It will be ignored.',
        );
      }
    });
  }

  store.useSyncedValues({
    disabled: disabledProp,
    get modal() {
      return store.context.parent.type === undefined ? modalProp() : undefined;
    },
    get rootId() {
      return useId()();
    },
  });

  const {
    openMethod,
    triggerProps: interactionTypeProps,
    reset: resetOpenInteractionType,
  } = useOpenInteractionType(open);

  useImplicitActiveTrigger({ store });
  const { forceUnmount } = useOpenStateTransitions({
    get open() {
      return open();
    },
    store,
    onUnmount() {
      store.update({ allowMouseEnter: false, stickIfOpen: true });
      resetOpenInteractionType();
    },
  });

  let allowOutsidePressDismissalRef = store.context.parent.type !== 'context-menu';
  const allowOutsidePressDismissalTimeout = useTimeout();

  createEffect(() => {
    if (!open()) {
      openEventRef = null;
    }

    if (store.context.parent.type !== 'context-menu') {
      return;
    }

    if (!open()) {
      allowOutsidePressDismissalTimeout.clear();
      allowOutsidePressDismissalRef = false;
      return;
    }

    // With `mousedown` outside press events and long press touch input, there
    // needs to be a grace period after opening to ensure the dismissal event
    // doesn't fire immediately after open.
    allowOutsidePressDismissalTimeout.start(500, () => {
      allowOutsidePressDismissalRef = true;
    });
  });

  useScrollLock({
    enabled: () =>
      open() &&
      modal() &&
      lastOpenChangeReason() !== REASONS.triggerHover &&
      openMethod() !== 'touch',
    referenceElement: positionerElement,
  });

  createEffect(() => {
    if (!open() && !hoverEnabled()) {
      store.set('hoverEnabled', true);
    }
  });

  let allowTouchToCloseRef = true;
  const allowTouchToCloseTimeout = useTimeout();

  const setOpen = (
    nextOpen: boolean,
    eventDetails: Omit<MenuRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) => {
    const reason = eventDetails.reason;

    if (
      open() === nextOpen &&
      eventDetails.trigger === activeTriggerElement() &&
      lastOpenChangeReason() === reason
    ) {
      return;
    }

    (eventDetails as MenuRoot.ChangeEventDetails).preventUnmountOnClose = () => {
      store.set('preventUnmountingOnClose', true);
    };

    // Do not immediately reset the activeTriggerId to allow
    // exit animations to play and focus to be returned correctly.
    if (!nextOpen && eventDetails.trigger == null) {
      eventDetails.trigger = activeTriggerElement() ?? undefined;
    }

    props.onOpenChange?.(nextOpen, eventDetails as MenuRoot.ChangeEventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    const details: FloatingUIOpenChangeDetails = {
      open: nextOpen,
      nativeEvent: eventDetails.event,
      reason: eventDetails.reason,
      nested: nested(),
    };

    floatingEvents?.emit('openchange', details);

    const nativeEvent = eventDetails.event as Event;
    if (
      nextOpen === false &&
      nativeEvent?.type === 'click' &&
      (nativeEvent as PointerEvent).pointerType === 'touch' &&
      !allowTouchToCloseRef
    ) {
      return;
    }

    // Workaround `enableFocusInside` in Floating UI setting `tabindex=0` of a non-highlighted
    // option upon close when tabbing out due to `keepMounted=true`:
    // https://github.com/floating-ui/floating-ui/pull/3004/files#diff-962a7439cdeb09ea98d4b622a45d517bce07ad8c3f866e089bda05f4b0bbd875R194-R199
    // This otherwise causes options to retain `tabindex=0` incorrectly when the popup is closed
    // when tabbing outside.
    const idx = activeIndex();
    if (!nextOpen && idx !== null) {
      const activeOption = store.context.itemDomElements.current[idx];
      // Wait for Floating UI's focus effect to have fired
      queueMicrotask(() => {
        activeOption?.setAttribute('tabindex', '-1');
      });
    }

    // Prevent the menu from closing on mobile devices that have a delayed click event.
    // In some cases the menu, when tapped, will fire the focus event first and then the click event.
    // Without this guard, the menu will close immediately after opening.
    if (nextOpen && reason === REASONS.triggerFocus) {
      allowTouchToCloseRef = false;
      allowTouchToCloseTimeout.start(300, () => {
        allowTouchToCloseRef = true;
      });
    } else {
      allowTouchToCloseRef = true;
      allowTouchToCloseTimeout.clear();
    }

    const isKeyboardClick =
      (reason === REASONS.triggerPress || reason === REASONS.itemPress) &&
      (nativeEvent as MouseEvent).detail === 0 &&
      nativeEvent?.isTrusted;
    const isDismissClose = !nextOpen && (reason === REASONS.escapeKey || reason == null);

    function changeState() {
      const updatedState: Partial<State<Payload>> = { open: nextOpen, openChangeReason: reason };
      openEventRef = eventDetails.event ?? null;

      // If a popup is closing, the `trigger` may be null.
      // We want to keep the previous value so that exit animations are played and focus is returned correctly.
      const newTriggerId = eventDetails.trigger?.id ?? null;
      if (newTriggerId || nextOpen) {
        updatedState.activeTriggerId = newTriggerId;
        updatedState.activeTriggerElement = eventDetails.trigger ?? null;
      }

      store.update(updatedState);
    }

    if (!nextOpen) {
      store.context.floatingTreeRoot.events.emit('menuopenchange', {
        open: false,
        nodeId: store.select('floatingNodeId'),
        parentNodeId: store.select('floatingParentNodeId'),
        reason,
      });
    }

    changeState();

    if (!nextOpen && reason === REASONS.focusOut && store.context.parent.type === 'menu') {
      queueMicrotask(() => {
        const trigger = eventDetails.trigger as HTMLElement | undefined;
        const doc = trigger?.ownerDocument;
        if (trigger && doc?.activeElement === doc?.body) {
          trigger.focus();
        }
      });
    }

    if (!nextOpen && reason === REASONS.itemPress && !store.context.hasExplicitFinalFocus) {
      queueMicrotask(() => {
        const trigger = eventDetails.trigger as HTMLElement | undefined;
        const doc = trigger?.ownerDocument;
        if (trigger && doc?.activeElement === doc?.body) {
          trigger.focus();
        }
      });
    }

    if (
      store.context.parent.type === 'menubar' &&
      (reason === REASONS.triggerFocus ||
        reason === REASONS.focusOut ||
        reason === REASONS.triggerHover ||
        reason === REASONS.listNavigation ||
        reason === REASONS.siblingOpen)
    ) {
      store.set('instantType', 'group');
    } else if (isKeyboardClick || isDismissClose) {
      store.set('instantType', isKeyboardClick ? 'click' : 'dismiss');
    } else {
      store.set('instantType', undefined);
    }
  };

  const createMenuEventDetails = (reason: MenuRoot.ChangeEventReason) => {
    const details: MenuRoot.ChangeEventDetails =
      createChangeEventDetails<MenuRoot.ChangeEventReason>(reason) as MenuRoot.ChangeEventDetails;
    details.preventUnmountOnClose = () => {
      store.set('preventUnmountingOnClose', true);
    };

    return details;
  };

  const handleImperativeClose = () => {
    store.setOpen(false, createMenuEventDetails(REASONS.imperativeAction));
  };

  if (store.context.parent.type === 'context-menu') {
    store.context.parent.context.actionsRef.current = { setOpen };

    createEffect(() => {
      (store.context.parent as any).context.positionerRef.current = positionerElement();
    });
  }

  const floatingRootContext = useSyncedFloatingRootContext({
    popupStore: store,
    onOpenChange: setOpen,
  });

  floatingEvents = floatingRootContext.context.events;
  store.context.floatingRootContext = floatingRootContext;

  const handleSetOpenEvent = ({
    open: nextOpen,
    eventDetails,
  }: {
    open: boolean;
    eventDetails: MenuRoot.ChangeEventDetails;
  }) => setOpen(nextOpen, eventDetails);

  onMount(() => {
    // Support initially open state when uncontrolled
    if (openProp() === undefined && store.state.open === false && defaultOpen() === true) {
      store.update({
        open: true,
        activeTriggerId: defaultTriggerIdProp(),
      });
    }

    if (props.actionsRef) {
      props.actionsRef.current = { unmount: forceUnmount, close: handleImperativeClose };
    }

    floatingEvents.on('setOpen', handleSetOpenEvent);
    onCleanup(() => floatingEvents?.off('setOpen', handleSetOpenEvent));
  });

  const dismiss = useDismiss({
    context: floatingRootContext,
    props: {
      get enabled() {
        return !disabled();
      },
      get bubbles() {
        return {
          escapeKey: closeParentOnEsc() && store.context.parent.type === 'menu',
        };
      },
      get outsidePress() {
        if (
          store.context.parent.type !== 'context-menu' ||
          openEventRef?.type === 'contextmenu' ||
          store.context.allowMouseUpTriggerRef.current
        ) {
          return true;
        }

        return allowOutsidePressDismissalRef;
      },
      get externalTree() {
        return nested() ? store.context.floatingTreeRoot : undefined;
      },
    },
  });

  const role = useRole({ context: floatingRootContext, props: { role: 'menu' } });

  const direction = useDirection();

  const setActiveIndex = (index: number | null) => {
    if (store.select('activeIndex') === index) {
      return;
    }
    store.set('activeIndex', index);
  };

  const listNavigation = useListNavigation({
    context: floatingRootContext,
    props: {
      get enabled() {
        return !disabled();
      },
      get listRef() {
        return store.context.itemDomElements.current;
      },
      get activeIndex() {
        return activeIndex();
      },
      get nested() {
        return store.context.parent.type !== undefined;
      },
      get loopFocus() {
        return loopFocus();
      },
      get orientation() {
        return orientation();
      },
      get parentOrientation() {
        const p = store.context.parent;
        return p.type === 'menubar' ? p.context.orientation() : undefined;
      },
      get rtl() {
        return direction() === 'rtl';
      },
      disabledIndices: EMPTY_ARRAY,
      onNavigate: setActiveIndex,
      get openOnArrowKeyDown() {
        return store.context.parent.type !== 'context-menu';
      },
      get externalTree() {
        return nested() ? store.context.floatingTreeRoot : undefined;
      },
      get focusItemOnHover() {
        return highlightItemOnHover();
      },
    },
  });

  const onTypingChange = (nextTyping: boolean) => {
    store.context.typingRef.current = nextTyping;
  };

  const typeahead = useTypeahead({
    context: floatingRootContext,
    props: {
      get listRef() {
        return store.context.itemLabels.current;
      },
      get activeIndex() {
        return activeIndex();
      },
      resetMs: TYPEAHEAD_RESET_MS,
      onMatch: (index) => {
        if (open() && index !== activeIndex()) {
          store.set('activeIndex', index);
        }
      },
      onTypingChange,
    },
  });

  const { getReferenceProps, getFloatingProps, getItemProps, getTriggerProps } = useInteractions([
    dismiss,
    role,
    listNavigation,
    typeahead,
  ]);

  const activeTriggerProps = createMemo(() => {
    const mergedProps = mergeProps([
      getReferenceProps(),
      {
        onMouseMove() {
          store.set('allowMouseEnter', true);
        },
      },
      interactionTypeProps,
    ]);

    delete mergedProps.role;
    return mergedProps;
  });

  const inactiveTriggerProps = createMemo(() => {
    const triggerProps = getTriggerProps();
    if (!triggerProps) {
      return triggerProps;
    }

    const mergedProps = mergeProps(triggerProps, interactionTypeProps);
    delete mergedProps.role;
    delete mergedProps['aria-controls'];
    return mergedProps;
  });

  const popupProps = createMemo(() =>
    getFloatingProps({
      onMouseMove() {
        store.set('allowMouseEnter', true);
        if (store.context.parent.type === 'menu') {
          store.set('hoverEnabled', false);
        }
      },
      onClick() {
        if (store.select('hoverEnabled')) {
          store.set('hoverEnabled', false);
        }
      },
      onKeyDown(event) {
        // The Menubar's CompositeRoot captures keyboard events via
        // event delegation. This works well when Menu.Root is nested inside Menubar,
        // but with detached triggers we need to manually forward the event to the CompositeRoot.
        const relay = store.select('keyboardEventRelay');
        // TODO: dunno how to do in solid yet?
        // if (relay && !event.isPropagationStopped()) {
        if (relay && !event.defaultPrevented) {
          relay(event);
        }
      },
    }),
  );

  const itemProps = createMemo(() => getItemProps());

  store.useSyncedValues({
    activeTriggerProps,
    inactiveTriggerProps,
    popupProps,
    itemProps,
  });

  const context: MenuRootContext<Payload> = { store, parent: parentFromContext };

  const content = createMemo(() => {
    return (
      <MenuRootContext.Provider value={context as MenuRootContext}>
        <ComponentWithPayload payload={payload} children={props.children} />
      </MenuRootContext.Provider>
    );
  });

  return (
    <Show
      when={store.context.parent.type === undefined || store.context.parent.type === 'context-menu'}
      // set up a FloatingTree to provide the context to nested menus
      fallback={content()}
    >
      <FloatingTree>{content()}</FloatingTree>
    </Show>
  );
}

export interface MenuRootProps<Payload = unknown> {
  /**
   * Whether the menu is initially open.
   *
   * To render a controlled menu, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Determines if the menu enters a modal state when open.
   * - `true`: user interaction is limited to the menu: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Event handler called when the menu is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: MenuRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the menu is closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the menu is currently open.
   */
  open?: boolean | undefined;
  /**
   * The visual orientation of the menu.
   * Controls whether roving focus uses up/down or left/right arrow keys.
   * @default 'vertical'
   */
  orientation?: MenuRoot.Orientation | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When in a submenu, determines whether pressing the Escape key
   * closes the entire menu, or only the current child menu.
   * @default true
   */
  closeParentOnEsc?: boolean | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: When specified, the menu will not be unmounted when closed.
   *    Instead, the `unmount` function must be called to unmount the menu manually.
   *   Useful when the menu's animation is controlled by an external library.
   * - `close`: When specified, the menu can be closed imperatively.
   */
  actionsRef?: ReactLikeRef<MenuRoot.Actions | null> | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjunction with the `open` prop to create a controlled popover.
   * There's no need to specify this prop when the popover is uncontrolled (i.e. when the `open` prop is not set).
   */
  triggerId?: (string | null) | undefined;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjuntion with the `defaultOpen` prop to create an initially open popover.
   */
  defaultTriggerId?: (string | null) | undefined;
  /**
   * A handle to associate the menu with a trigger.
   * If specified, allows external triggers to control the menu's open state.
   */
  handle?: MenuHandle<Payload> | undefined;
  /**
   * The content of the popover.
   * This can be a regular React node or a render function that receives the `payload` of the active trigger.
   */
  children?: JSX.Element | PayloadChildRenderFunction<Payload>;
}

export interface MenuRootActions {
  unmount: () => void;
  close: () => void;
}

export type MenuRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.focusOut
  | typeof REASONS.listNavigation
  | typeof REASONS.escapeKey
  | typeof REASONS.itemPress
  | typeof REASONS.closePress
  | typeof REASONS.siblingOpen
  | typeof REASONS.cancelOpen
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type MenuRootChangeEventDetails = BaseUIChangeEventDetails<MenuRoot.ChangeEventReason> & {
  preventUnmountOnClose(): void;
};

export type MenuRootOrientation = 'horizontal' | 'vertical';

export type MenuParent =
  | {
      type: 'menu';
      store: MenuStore<unknown>;
    }
  | {
      type: 'menubar';
      context: MenubarContext;
    }
  | {
      type: 'context-menu';
      context: ContextMenuRootContext;
    }
  | {
      type: 'nested-context-menu';
      context: ContextMenuRootContext;
      menuContext: MenuRootContext;
    }
  | {
      type: undefined;
    };

export namespace MenuRoot {
  export type Props<Payload = unknown> = MenuRootProps<Payload>;
  export type Actions = MenuRootActions;
  export type ChangeEventReason = MenuRootChangeEventReason;
  export type ChangeEventDetails = MenuRootChangeEventDetails;
  export type Orientation = MenuRootOrientation;
}
