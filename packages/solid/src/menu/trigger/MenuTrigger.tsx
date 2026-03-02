import { EMPTY_OBJECT } from '@base-ui/utils/empty';
import { ownerDocument } from '@base-ui/utils/owner';
import {
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  Show,
  type Accessor,
  type JSX,
} from 'solid-js';
import { FocusableElement } from 'tabbable';
import { CompositeItem } from '../../composite/item/CompositeItem';
import { useCompositeRootContext } from '../../composite/root/CompositeRootContext';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import {
  safePolygon,
  useClick,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingTree,
  useFocus,
  useHoverReferenceInteraction,
  useInteractions,
} from '../../floating-ui-solid';
import { FloatingTreeStore } from '../../floating-ui-solid/components/FloatingTreeStore';
import {
  contains,
  getNextTabbable,
  getTabbableAfterElement,
  getTabbableBeforeElement,
  isOutsideEvent,
} from '../../floating-ui-solid/utils';
import { useMenubarContext } from '../../menubar/MenubarContext';
import { access, splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button/useButton';
import { PATIENT_CLICK_THRESHOLD } from '../../utils/constants';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { FocusGuard } from '../../utils/FocusGuard';
import { getPseudoElementBounds } from '../../utils/getPseudoElementBounds';
import { useTriggerDataForwarding } from '../../utils/popups';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useMixedToggleClickHandler } from '../../utils/useMixedToggleClickHandler';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { MenuParent } from '../root/MenuRoot';
import { useMenuRootContext } from '../root/MenuRootContext';
import { MenuHandle } from '../store/MenuHandle';
import type { MenuStore } from '../store/MenuStore';
import { findRootOwnerId } from '../utils/findRootOwnerId';

const BOUNDARY_OFFSET = 2;

/**
 * A button that opens the menu.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuTrigger<Payload>(componentProps: MenuTrigger.Props<Payload>) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'nativeButton',
    'id',
    'openOnHover',
    'delay',
    'closeDelay',
    'handle',
    'payload',
  ]);
  const disabledProp = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;
  const idProp = () => local.id;
  const openOnHoverProp = () => local.openOnHover;
  const delay = () => local.delay ?? 100;
  const closeDelay = () => local.closeDelay ?? 0;

  const rootContext = useMenuRootContext(true);
  const store = (local.handle?.store ?? rootContext?.store) as MenuStore<Payload>;
  if (!store) {
    throw new Error(
      'Base UI: <Menu.Trigger> must be either used within a <Menu.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(idProp);
  const isTriggerActive = store.useState('isTriggerActive', thisTriggerId);
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId);

  let triggerElementRef = null as HTMLElement | null | undefined;

  const parent = useMenuParent();
  const compositeRootContext = useCompositeRootContext(true);
  const floatingTreeRootFromContext = useFloatingTree();
  const floatingTreeRoot = floatingTreeRootFromContext ?? new FloatingTreeStore();

  const floatingNodeId = useFloatingNodeId(floatingTreeRoot);
  const floatingParentNodeId = useFloatingParentNodeId();

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding({
    get triggerId() {
      return thisTriggerId();
    },
    get triggerElement() {
      return triggerElementRef;
    },
    store,
    stateUpdates: {
      payload: local.payload,
      get closeDelay() {
        return closeDelay();
      },
      get floatingNodeId() {
        return floatingNodeId();
      },
      floatingParentNodeId,
      get keyboardEventRelay() {
        return compositeRootContext?.relayKeyboardEvent as any;
      },
    },
  });
  store.context.parent = parent;
  store.context.floatingTreeRoot = floatingTreeRoot;

  const isInMenubar = parent.type === 'menubar';

  const rootDisabled = store.useState('disabled');
  const disabled = createMemo(() => {
    return (
      disabledProp() || rootDisabled() || (parent.type === 'menubar' && parent.context.disabled())
    );
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  createEffect(() => {
    if (!isOpenedByThisTrigger() && parent.type === undefined) {
      store.context.allowMouseUpTriggerRef.current = false;
    }
  });

  let triggerRef = null as HTMLElement | null | undefined;
  const allowMouseUpTriggerTimeout = useTimeout();

  const handleDocumentMouseUp = (mouseEvent: MouseEvent) => {
    if (!triggerRef) {
      return;
    }

    allowMouseUpTriggerTimeout.clear();
    store.context.allowMouseUpTriggerRef.current = false;

    const mouseUpTarget = mouseEvent.target as Element | null;

    if (
      contains(triggerRef, mouseUpTarget) ||
      contains(access(store.select('positionerElement')), mouseUpTarget) ||
      mouseUpTarget === triggerRef
    ) {
      return;
    }

    if (mouseUpTarget != null && findRootOwnerId(mouseUpTarget) === store.select('rootId')) {
      return;
    }

    const bounds = getPseudoElementBounds(triggerRef);

    if (
      mouseEvent.clientX >= bounds.left - BOUNDARY_OFFSET &&
      mouseEvent.clientX <= bounds.right + BOUNDARY_OFFSET &&
      mouseEvent.clientY >= bounds.top - BOUNDARY_OFFSET &&
      mouseEvent.clientY <= bounds.bottom + BOUNDARY_OFFSET
    ) {
      return;
    }

    floatingTreeRoot.events.emit('close', { domEvent: mouseEvent, reason: REASONS.cancelOpen });
  };

  createEffect(() => {
    if (isOpenedByThisTrigger() && store.select('lastOpenChangeReason') === REASONS.triggerHover) {
      const doc = ownerDocument(triggerRef ?? null);
      doc.addEventListener('mouseup', handleDocumentMouseUp, { once: true });
    }
  });

  const parentMenubarHasSubmenuOpen = createMemo(() => {
    return parent.type === 'menubar' && parent.context.hasSubmenuOpen();
  });

  const openOnHover = () => openOnHoverProp() ?? parentMenubarHasSubmenuOpen();

  const hoverProps = useHoverReferenceInteraction({
    get context() {
      return store.context.floatingRootContext;
    },
    props: {
      get enabled() {
        return (
          openOnHover() &&
          !disabled() &&
          parent.type !== 'context-menu' &&
          (!isInMenubar || (parentMenubarHasSubmenuOpen() && !isMountedByThisTrigger()))
        );
      },
      handleClose: safePolygon({
        get blockPointerEvents() {
          return !isInMenubar;
        },
      }),
      mouseOnly: true,
      move: false,
      get restMs() {
        return parent.type === undefined ? delay() : undefined;
      },
      delay: () => ({ close: closeDelay() }),
      get triggerElementRef() {
        return triggerElementRef;
      },
      externalTree: floatingTreeRoot,
      get isActiveTrigger() {
        return isTriggerActive();
      },
    },
  });

  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const [hoverResetTick, setHoverResetTick] = createSignal(0);
  const stickIfOpen = useStickIfOpen(isOpenedByThisTrigger, lastOpenChangeReason, hoverResetTick);

  const click = useClick({
    get context() {
      return store.context.floatingRootContext;
    },
    props: {
      get enabled() {
        return !disabled() && parent.type !== 'context-menu';
      },
      get event() {
        return isOpenedByThisTrigger() && isInMenubar ? 'click' : 'mousedown';
      },
      toggle: true,
      ignoreMouse: false,
      get stickIfOpen() {
        return parent.type === undefined ? stickIfOpen() : false;
      },
    },
  });

  const focus = useFocus({
    get context() {
      return store.context.floatingRootContext;
    },
    props: {
      get enabled() {
        return !disabled() && parentMenubarHasSubmenuOpen();
      },
    },
  });

  const mixedToggleHandlers = useMixedToggleClickHandler({
    get open() {
      return isOpenedByThisTrigger();
    },
    enabled: isInMenubar,
    mouseDownAction: 'open',
  });

  const localInteractionProps = useInteractions([click, focus]);

  const state: MenuTrigger.State = {
    get disabled() {
      return disabled();
    },
    get open() {
      return isOpenedByThisTrigger();
    },
  };

  const rootTriggerProps = store.useState('triggerProps', isMountedByThisTrigger);

  const ref = (el: any) => {
    triggerRef = el;
    triggerElementRef = el;
    buttonRef(el);
    registerTrigger(el);
    if (typeof componentProps.ref === 'function') {
      componentProps.ref(el);
    } else {
      componentProps.ref = el;
    }
  };

  const props = () => [
    localInteractionProps.getReferenceProps(),
    hoverProps ?? EMPTY_OBJECT,
    rootTriggerProps(),
    {
      'aria-haspopup': 'menu' as const,
      get id() {
        return thisTriggerId();
      },
      onFocus: (event: FocusEvent) => {
        const disabledValue = disabled();
        if (
          !isInMenubar ||
          !parentMenubarHasSubmenuOpen() ||
          isOpenedByThisTrigger() ||
          disabledValue
        ) {
          return;
        }

        const triggerElement = event.currentTarget as HTMLElement;

        queueMicrotask(() => {
          if (disabledValue) {
            return;
          }

          store.setOpen(
            true,
            createChangeEventDetails(REASONS.triggerFocus, event, triggerElement),
          );
        });
      },
      onMouseEnter: () => {
        if (isOpenedByThisTrigger() && lastOpenChangeReason() === REASONS.triggerHover) {
          setHoverResetTick((value) => value + 1);
        }
      },
      onMouseDown: (event: MouseEvent) => {
        if (store.select('open')) {
          return;
        }

        // mousedown -> mouseup on menu item should not trigger it within 200ms.
        allowMouseUpTriggerTimeout.start(200, () => {
          store.context.allowMouseUpTriggerRef.current = true;
        });

        const doc = ownerDocument(event.currentTarget as any);
        doc.addEventListener('mouseup', handleDocumentMouseUp, { once: true });
      },
    },
    mixedToggleHandlers(),
    elementProps,
    getButtonProps,
    {
      get role() {
        if (isInMenubar) {
          return 'menuitem';
        }

        return nativeButton() ? undefined : 'button';
      },
    },
  ];

  let preFocusGuardRef = null as HTMLElement | null | undefined;

  const handlePreFocusGuardFocus = (event: FocusEvent) => {
    store.setOpen(
      false,
      createChangeEventDetails(REASONS.focusOut, event, event.currentTarget as HTMLElement),
    );

    const previousTabbable: FocusableElement | null = getTabbableBeforeElement(preFocusGuardRef);
    previousTabbable?.focus();
  };

  const handleFocusTargetFocus = (event: FocusEvent) => {
    const currentPositionerElement = access(store.select('positionerElement'));
    if (currentPositionerElement && isOutsideEvent(event, currentPositionerElement)) {
      store.context.beforeContentFocusGuardRef.current?.focus();
    } else {
      store.setOpen(
        false,
        createChangeEventDetails(REASONS.focusOut, event, event.currentTarget as HTMLElement),
      );

      let nextTabbable = getTabbableAfterElement(
        store.context.triggerFocusTargetRef.current || triggerElementRef,
      );

      while (nextTabbable !== null && contains(currentPositionerElement, nextTabbable)) {
        const prevTabbable = nextTabbable;
        nextTabbable = getNextTabbable(nextTabbable);
        if (nextTabbable === prevTabbable) {
          break;
        }
      }

      nextTabbable?.focus();
    }
  };

  const element = useRenderElement('button', componentProps, {
    enabled: !isInMenubar,
    stateAttributesMapping: pressableTriggerOpenStateMapping,
    state,
    ref,
    get props() {
      return props();
    },
  });

  return (
    <Show
      when={isInMenubar}
      fallback={
        <>
          <Show when={isOpenedByThisTrigger()}>
            <FocusGuard
              ref={(el) => {
                preFocusGuardRef = el;
              }}
              onFocus={handlePreFocusGuardFocus}
            />
          </Show>
          {element()}
          <Show when={isOpenedByThisTrigger()}>
            <FocusGuard
              ref={(el) => {
                store.context.triggerFocusTargetRef.current = el;
              }}
              onFocus={handleFocusTargetFocus}
            />
          </Show>
        </>
      }
    >
      <CompositeItem
        tag="button"
        render={renderProps.render}
        class={renderProps.class}
        state={state}
        refs={ref}
        props={props()}
        stateAttributesMapping={pressableTriggerOpenStateMapping}
      />
    </Show>
  );
}

export interface MenuTriggerProps<Payload = unknown>
  extends NativeButtonProps, BaseUIComponentProps<'button', MenuTrigger.State> {
  children?: JSX.Element;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A handle to associate the trigger with a menu.
   */
  handle?: MenuHandle<Payload> | undefined;
  /**
   * A payload to pass to the menu when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * How long to wait before the menu may be opened on hover. Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 100
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the menu that was opened on hover.
   * Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * Whether the menu should also open when the trigger is hovered.
   */
  openOnHover?: boolean | undefined;
}

export type MenuTriggerState = {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * Whether the trigger is disabled.
   */
  disabled: boolean;
};

export namespace MenuTrigger {
  export type Props<Payload = unknown> = MenuTriggerProps<Payload>;
  export type State = MenuTriggerState;
}

/**
 * Determines whether to ignore clicks after a hover-open.
 */
function useStickIfOpen(
  open: Accessor<boolean>,
  openReason: Accessor<string | null>,
  hoverResetTick: Accessor<number>,
) {
  const stickIfOpenTimeout = useTimeout();
  const [stickIfOpen, setStickIfOpen] = createSignal(false);
  createRenderEffect(() => {
    hoverResetTick();

    if (open() && openReason() === 'trigger-hover') {
      // Only allow "patient" clicks to close the menu if it's open.
      // If they clicked within 500ms of the menu opening, keep it open.
      setStickIfOpen(true);
      stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
        setStickIfOpen(false);
      });
    } else if (!open()) {
      stickIfOpenTimeout.clear();
      setStickIfOpen(false);
    }
  });

  return stickIfOpen;
}

function useMenuParent(): MenuParent {
  const contextMenuContext = useContextMenuRootContext(true);
  const parentContext = useMenuRootContext(true);
  const menubarContext = useMenubarContext(true);

  if (menubarContext) {
    return {
      type: 'menubar',
      context: menubarContext,
    };
  }

  // Ensure this is not a Menu nested inside ContextMenu.Trigger.
  // ContextMenu parentContext is always undefined as ContextMenu.Root is instantiated with
  // <MenuRootContext.Provider value={undefined}>
  if (contextMenuContext && !parentContext) {
    return {
      type: 'context-menu',
      context: contextMenuContext,
    };
  }

  return {
    type: undefined,
  };
}
