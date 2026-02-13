import { EMPTY_ARRAY } from '@base-ui/utils/empty';
import {
  createEffect,
  createMemo,
  onCleanup,
  onMount,
  Show,
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
  useInteractions,
  useListNavigation,
  useRole,
  useSyncedFloatingRootContext,
  useTypeahead,
} from '../../floating-ui-solid';
import { MenubarContext, useMenubarContext } from '../../menubar/MenubarContext';
import { mergeProps } from '../../merge-props';
import { TYPEAHEAD_RESET_MS } from '../../utils/constants';
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
import type { FloatingUIOpenChangeDetails } from '../../utils/types';
import { useAnimationFrame } from '../../utils/useAnimationFrame';
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

  const parentFromContext = createMemo<MenuParent>(() => {
    if (isSubmenu && parentMenuRootContext) {
      return {
        type: 'menu',
        store: parentMenuRootContext.store,
      };
    }

    if (menubarContext) {
      return {
        type: 'menubar',
        context: menubarContext,
      };
    }

    // Ensure this is not a Menu nested inside ContextMenu.Trigger.
    // ContextMenu parentContext is always undefined as ContextMenu.Root is instantiated with
    // <MenuRootContext.Provider value={undefined}>
    if (contextMenuContext && !parentMenuRootContext) {
      return {
        type: 'context-menu',
        context: contextMenuContext,
      };
    }

    return {
      type: undefined,
    };
  });

  const store = MenuStore.useStore(props.handle?.store, {
    get parent() {
      return parentFromContext();
    },
  });

  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const floatingNodeIdFromContext = () => useFloatingNodeId(floatingTreeRoot())();
  const floatingParentNodeIdFromContext = useFloatingParentNodeId();

  createEffect(() => {
    if (contextMenuContext && !parentMenuRootContext) {
      // This is a context menu root.
      // It doesn't support detached triggers yet, so we have to sync the parent context manually.
      store.update({
        parent: {
          type: 'context-menu',
          context: contextMenuContext,
        },
        floatingNodeId: floatingNodeIdFromContext(),
        floatingParentNodeId: floatingParentNodeIdFromContext,
      });
    } else if (parentMenuRootContext) {
      store.update({
        floatingNodeId: floatingNodeIdFromContext(),
        floatingParentNodeId: floatingParentNodeIdFromContext,
      });
    }
  });

  store.useControlledProp('open', openProp, defaultOpen);
  store.useControlledProp('activeTriggerId', triggerIdProp, defaultTriggerIdProp);

  store.useContextCallback('onOpenChangeComplete', props.onOpenChangeComplete);

  const open = store.useState('open');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const positionerElement = store.useState('positionerElement');
  const hoverEnabled = store.useState('hoverEnabled');
  const modal = store.useState('modal');
  const disabled = store.useState('disabled');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const parent = store.useState('parent');

  const activeIndex = store.useState('activeIndex');
  const payload = store.useState('payload') as Accessor<Payload | undefined>;
  const floatingParentNodeId = store.useState('floatingParentNodeId');

  let openEventRef = null as Event | null;

  const nested = () => floatingParentNodeId() != null;

  let floatingEvents: FloatingEvents;

  createEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      if (parent().type !== undefined && props.modal !== undefined) {
        console.warn(
          'Base UI: The `modal` prop is not supported on nested menus. It will be ignored.',
        );
      }
    }
  });

  createEffect(() => {
    store.useSyncedValues({
      disabled: disabledProp(),
      modal: parent().type === undefined ? modalProp() : undefined,
      rootId: useId()(),
    });
  });

  const {
    openMethod,
    triggerProps: interactionTypeProps,
    reset: resetOpenInteractionType,
  } = useOpenInteractionType(open);

  useImplicitActiveTrigger(store);
  const { forceUnmount } = useOpenStateTransitions(open, store, () => {
    store.update({ allowMouseEnter: false, stickIfOpen: true });
    resetOpenInteractionType();
  });

  let allowOutsidePressDismissalRef = parent().type !== 'context-menu';
  const allowOutsidePressDismissalTimeout = useTimeout();

  createEffect(() => {
    if (!open()) {
      openEventRef = null;
    }

    if (parent().type !== 'context-menu') {
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
      const activeOption = store.context.refs.itemDomElements[idx];
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

    changeState();

    if (
      parent().type === 'menubar' &&
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

  onMount(() => {
    props.actionsRef = { unmount: forceUnmount, close: handleImperativeClose };
  });

  createEffect(() => {
    const p = parent();
    if (p.type === 'context-menu') {
      p.context.refs.positionerRef = positionerElement();
      p.context.refs.actionsRef = { setOpen };
    }
  });

  const floatingRootContext = useSyncedFloatingRootContext({
    popupStore: store,
    onOpenChange: setOpen,
  });

  floatingEvents = floatingRootContext.context.events;

  const handleSetOpenEvent = ({
    open: nextOpen,
    eventDetails,
  }: {
    open: boolean;
    eventDetails: MenuRoot.ChangeEventDetails;
  }) => setOpen(nextOpen, eventDetails);

  onMount(() => {
    floatingEvents.on('setOpen', handleSetOpenEvent);

    onCleanup(() => {
      floatingEvents?.off('setOpen', handleSetOpenEvent);
    });
  });

  const dismiss = useDismiss(floatingRootContext, {
    enabled: () => !disabled(),
    bubbles: () => ({
      escapeKey: closeParentOnEsc() && parent().type === 'menu',
    }),
    outsidePress() {
      if (parent().type !== 'context-menu' || openEventRef?.type === 'contextmenu') {
        return true;
      }

      return allowOutsidePressDismissalRef;
    },
    get externalTree() {
      return nested() ? floatingTreeRoot() : undefined;
    },
  });

  const role = useRole(floatingRootContext, {
    role: 'menu',
  });

  const direction = useDirection();

  const setActiveIndex = (index: number | null) => {
    if (store.select('activeIndex') === index) {
      return;
    }
    store.set('activeIndex', index);
  };

  const listNavigation = useListNavigation(floatingRootContext, {
    enabled: () => !disabled(),
    listRef: store.context.refs.itemDomElements,
    activeIndex,
    nested: () => parent().type !== undefined,
    loopFocus,
    orientation,
    parentOrientation: () => {
      const p = parent();
      return p.type === 'menubar' ? p.context.orientation() : undefined;
    },
    rtl: () => direction() === 'rtl',
    disabledIndices: EMPTY_ARRAY,
    onNavigate: setActiveIndex,
    openOnArrowKeyDown: () => parent().type !== 'context-menu',
    get externalTree() {
      return nested() ? floatingTreeRoot() : undefined;
    },
    focusItemOnHover: highlightItemOnHover,
  });

  const onTypingChange = (nextTyping: boolean) => {
    store.context.refs.typingRef = nextTyping;
  };

  const typeahead = useTypeahead(floatingRootContext, {
    listRef: store.context.refs.itemLabels,
    activeIndex,
    resetMs: TYPEAHEAD_RESET_MS,
    onMatch: (index) => {
      if (open() && index !== activeIndex()) {
        store.set('activeIndex', index);
      }
    },
    onTypingChange,
  });

  const { getReferenceProps, getFloatingProps, getItemProps, getTriggerProps } = useInteractions([
    dismiss,
    role,
    listNavigation,
    typeahead,
  ]);

  const activeTriggerProps = createMemo(() => {
    return mergeProps([
      getReferenceProps(),
      {
        onMouseEnter() {
          store.set('hoverEnabled', true);
        },
        onMouseMove() {
          store.set('allowMouseEnter', true);
        },
      },
      interactionTypeProps,
      { role: undefined },
    ]);
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

  const disableHoverTimeout = useAnimationFrame();
  const popupProps = createMemo(() =>
    getFloatingProps({
      onMouseEnter() {
        if (parent().type === 'menu') {
          disableHoverTimeout.request(() => store.set('hoverEnabled', false));
        }
      },
      onMouseMove() {
        store.set('allowMouseEnter', true);
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
        if (relay) {
          relay(event);
        }
      },
    }),
  );

  const itemProps = createMemo(() => getItemProps());

  createEffect(() => {
    store.useSyncedValues({
      floatingRootContext,
      activeTriggerProps: activeTriggerProps(),
      inactiveTriggerProps: inactiveTriggerProps(),
      popupProps: popupProps(),
      itemProps: itemProps(),
    });
  });

  const context: MenuRootContext<Payload> = {
    store,
    get parent() {
      return parentFromContext();
    },
  };

  const content = () => {
    return (
      <MenuRootContext.Provider value={context as MenuRootContext}>
        {typeof props.children === 'function'
          ? props.children({ payload: payload() })
          : props.children}
      </MenuRootContext.Provider>
    );
  };

  return (
    <Show
      when={parent().type === undefined || parent().type === 'context-menu'}
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
  defaultOpen?: boolean;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean;
  /**
   * Determines if the menu enters a modal state when open.
   * - `true`: user interaction is limited to the menu: document page scroll is locked and and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   * @default true
   */
  modal?: boolean;
  /**
   * Event handler called when the menu is opened or closed.
   */
  onOpenChange?: (open: boolean, eventDetails: MenuRoot.ChangeEventDetails) => void;
  /**
   * Event handler called after any animations complete when the menu is closed.
   */
  onOpenChangeComplete?: (open: boolean) => void;
  /**
   * Whether the menu is currently open.
   */
  open?: boolean;
  /**
   * The visual orientation of the menu.
   * Controls whether roving focus uses up/down or left/right arrow keys.
   * @default 'vertical'
   */
  orientation?: MenuRoot.Orientation;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean;
  /**
   * When in a submenu, determines whether pressing the Escape key
   * closes the entire menu, or only the current child menu.
   * @default true
   */
  closeParentOnEsc?: boolean;
  /**
   * A ref to imperative actions.
   * - `unmount`: When specified, the menu will not be unmounted when closed.
   *    Instead, the `unmount` function must be called to unmount the menu manually.
   *   Useful when the menu's animation is controlled by an external library.
   * - `close`: When specified, the menu can be closed imperatively.
   */
  actionsRef?: MenuRoot.Actions;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjuntion with the `open` prop to create a controlled popover.
   * There's no need to specify this prop when the popover is uncontrolled (i.e. when the `open` prop is not set).
   */
  triggerId?: string | null;
  /**
   * ID of the trigger that the popover is associated with.
   * This is useful in conjuntion with the `defaultOpen` prop to create an initially open popover.
   */
  defaultTriggerId?: string | null;
  /**
   * A handle to associate the popover with a trigger.
   * If specified, allows external triggers to control the popover's open state.
   */
  handle?: MenuHandle<Payload>;
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
