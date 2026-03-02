import { batch, createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { isTabbable } from 'tabbable';
import { CompositeItem } from '../../composite/item/CompositeItem';
import {
  safePolygon,
  useClick,
  useFloatingRootContext,
  useFloatingTree,
  useHover,
  useInteractions,
} from '../../floating-ui-solid';
import {
  contains,
  getNextTabbable,
  getPreviousTabbable,
  isOutsideEvent,
  stopEvent,
} from '../../floating-ui-solid/utils';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { EMPTY_ARRAY, ownerVisuallyHidden, PATIENT_CLICK_THRESHOLD } from '../../utils/constants';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { FocusGuard } from '../../utils/FocusGuard';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../utils/types';
import { useAnimationFrame } from '../../utils/useAnimationFrame';
import { useTimeout } from '../../utils/useTimeout';
import { useNavigationMenuItemContext } from '../item/NavigationMenuItemContext';
import { useNavigationMenuDismissContext } from '../list/NavigationMenuDismissContext';
import { NavigationMenuRoot } from '../root/NavigationMenuRoot';
import {
  useNavigationMenuRootContext,
  useNavigationMenuTreeContext,
} from '../root/NavigationMenuRootContext';
import { NAVIGATION_MENU_TRIGGER_IDENTIFIER } from '../utils/constants';
import { isOutsideMenuEvent } from '../utils/isOutsideMenuEvent';

/**
 * Opens the navigation menu popup when hovered or clicked, revealing the
 * associated content.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuTrigger(componentProps: NavigationMenuTrigger.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'nativeButton',
    'disabled',
  ]);
  const nativeButton = () => local.nativeButton ?? true;

  const {
    value,
    setValue,
    mounted,
    open,
    positionerElement,
    setActivationDirection,
    setFloatingRootContext,
    popupElement,
    viewportElement,
    rootRef,
    beforeOutsideRef,
    afterOutsideRef,
    afterInsideRef,
    beforeInsideRef,
    prevTriggerElementRef,
    delay,
    closeDelay,
    orientation,
    setViewportInert,
    nested,
  } = useNavigationMenuRootContext();
  const { value: itemValue } = useNavigationMenuItemContext();
  const nodeId = useNavigationMenuTreeContext();
  const tree = useFloatingTree();
  const dismissProps = useNavigationMenuDismissContext();

  const stickIfOpenTimeout = useTimeout();
  const focusFrame = useAnimationFrame();

  const [triggerElement, setTriggerElement] = createSignal<HTMLElement | null | undefined>(
    undefined,
  );
  const [stickIfOpen, setStickIfOpen] = createSignal(true);
  const [pointerType, setPointerType] = createSignal<'mouse' | 'touch' | 'pen' | ''>('');

  let allowFocusRef = false;

  const isActiveItem = () => open() && value() === itemValue();
  const interactionsEnabled = () => (positionerElement() ? true : !value());

  createEffect(() => {
    if (!open()) {
      stickIfOpenTimeout.clear();
    }
  });

  createEffect(() => {
    if (isActiveItem() && open() && popupElement() && allowFocusRef) {
      allowFocusRef = false;
      focusFrame.request(() => {
        beforeOutsideRef.current?.focus();
      });
    }

    onCleanup(() => {
      focusFrame.cancel();
    });
  });

  function handleOpenChange(
    nextOpen: boolean,
    eventDetails: NavigationMenuRoot.ChangeEventDetails,
  ) {
    const isHover = eventDetails.reason === REASONS.triggerHover;

    if (!interactionsEnabled()) {
      return;
    }

    if (pointerType() === 'touch' && isHover) {
      return;
    }

    if (!nextOpen && value() !== itemValue()) {
      return;
    }

    function changeState() {
      if (isHover) {
        // Only allow "patient" clicks to close the popup if it's open.
        // If they clicked within 500ms of the popup opening, keep it open.
        setStickIfOpen(true);
        stickIfOpenTimeout.clear();
        stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
          setStickIfOpen(false);
        });
      }

      if (nextOpen) {
        setValue(itemValue(), eventDetails);
      } else {
        setValue(null, eventDetails);
        setPointerType('');
      }
    }

    changeState();
  }

  const context = useFloatingRootContext({
    get open() {
      return open();
    },
    onOpenChange: (openValue, eventDetails) =>
      handleOpenChange(openValue, eventDetails as NavigationMenuRoot.ChangeEventDetails),
    elements: {
      get reference() {
        return triggerElement();
      },
      get floating() {
        return positionerElement() || viewportElement();
      },
    },
  });

  const hover = useHover({
    get context() {
      return context;
    },
    props: {
      move: false,
      handleClose: safePolygon({
        get blockPointerEvents() {
          return pointerType() !== 'touch';
        },
      }),
      restMs: () => (mounted() && positionerElement() ? 0 : delay()),
      delay: () => ({ close: closeDelay() }),
    },
  });
  const click = useClick({
    get context() {
      return context;
    },
    props: {
      get enabled() {
        return interactionsEnabled();
      },
      get stickIfOpen() {
        return stickIfOpen();
      },
      get toggle() {
        return isActiveItem();
      },
    },
  });
  createEffect(() => {
    if (isActiveItem()) {
      setFloatingRootContext(context);
      prevTriggerElementRef.current = triggerElement();
    }
  });

  const { getReferenceProps } = useInteractions([hover, click]);

  function handleActivation(event: MouseEvent | KeyboardEvent) {
    batch(() => {
      const prevTriggerRect = prevTriggerElementRef.current?.getBoundingClientRect();

      if (mounted() && prevTriggerRect && triggerElement()) {
        const nextTriggerRect = triggerElement()!.getBoundingClientRect();
        const isMovingRight = nextTriggerRect.left > prevTriggerRect.left;
        const isMovingDown = nextTriggerRect.top > prevTriggerRect.top;

        if (orientation() === 'horizontal' && nextTriggerRect.left !== prevTriggerRect.left) {
          setActivationDirection(isMovingRight ? 'right' : 'left');
        } else if (orientation() === 'vertical' && nextTriggerRect.top !== prevTriggerRect.top) {
          setActivationDirection(isMovingDown ? 'down' : 'up');
        }
      }

      // Reset the `openEvent` to `undefined` when the active item changes so that a
      // `click` -> `hover` on new trigger -> `hover` back to old trigger doesn't unexpectedly
      // cause the popup to remain stuck open when leaving the old trigger.
      if (event.type !== 'click') {
        context.context.dataRef.openEvent = undefined;
      }

      if (pointerType() === 'touch' && event.type !== 'click') {
        return;
      }

      if (value() != null) {
        setValue(
          itemValue(),
          createChangeEventDetails(
            event.type === 'mouseenter' ? REASONS.triggerHover : REASONS.triggerPress,
            event,
          ),
        );
      }
    });
  }

  const state: NavigationMenuTrigger.State = {
    get open() {
      return isActiveItem();
    },
  };

  function handleSetPointerType(event: PointerEvent) {
    setPointerType(event.pointerType as 'mouse' | 'touch' | 'pen' | '');
  }

  const defaultProps: HTMLProps = {
    tabIndex: 0,
    onMouseEnter: handleActivation,
    onClick: handleActivation,
    onPointerEnter: handleSetPointerType,
    onPointerDown: handleSetPointerType,
    get 'aria-expanded'() {
      return isActiveItem();
    },
    get 'aria-controls'() {
      return isActiveItem() ? popupElement()?.id : undefined;
    },
    [NAVIGATION_MENU_TRIGGER_IDENTIFIER as string]: '',
    onFocus() {
      if (!isActiveItem()) {
        return;
      }
      setViewportInert(false);
    },
    onMouseMove() {
      allowFocusRef = false;
    },
    onKeyDown(event) {
      allowFocusRef = true;

      // For nested (submenu) triggers, don't intercept arrow keys that are used for
      // navigation in the parent content. The arrow keys should be handled by the
      // parent's CompositeRoot for navigating between items.
      if (nested()) {
        return;
      }

      const openHorizontal = orientation() === 'horizontal' && event.key === 'ArrowDown';
      const openVertical = orientation() === 'vertical' && event.key === 'ArrowRight';

      if (openHorizontal || openVertical) {
        setValue(itemValue(), createChangeEventDetails(REASONS.listNavigation, event));
        handleActivation(event);
        stopEvent(event);
      }
    },
    onBlur(event) {
      if (
        positionerElement() &&
        popupElement() &&
        isOutsideMenuEvent(
          {
            currentTarget: event.currentTarget,
            relatedTarget: event.relatedTarget as HTMLElement | null,
          },
          { popupElement: popupElement(), rootRef: rootRef.current, tree, nodeId: nodeId?.() },
        )
      ) {
        setValue(null, createChangeEventDetails(REASONS.focusOut, event));
      }
    },
  };

  const { getButtonProps, buttonRef } = useButton({
    disabled: local.disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
  });

  const referenceElement = () => positionerElement() || viewportElement();

  return (
    <>
      <CompositeItem
        tag="button"
        render={renderProps.render}
        class={renderProps.class}
        state={state}
        stateAttributesMapping={pressableTriggerOpenStateMapping}
        refs={[componentProps.ref as any, setTriggerElement, buttonRef]}
        props={[
          getReferenceProps,
          dismissProps?.reference || EMPTY_ARRAY,
          defaultProps,
          elementProps,
          getButtonProps,
        ]}
      />
      <Show when={isActiveItem()}>
        <>
          <FocusGuard
            ref={(el) => {
              beforeOutsideRef.current = el;
            }}
            onFocus={(event) => {
              const referenceEl = referenceElement();
              if (referenceEl && isOutsideEvent(event, referenceEl)) {
                beforeInsideRef.current?.focus();
              } else {
                const prevTabbable = getPreviousTabbable(triggerElement());
                prevTabbable?.focus();
              }
            }}
          />
          <span aria-owns={viewportElement()?.id} style={ownerVisuallyHidden} />
          <FocusGuard
            ref={(el) => {
              afterOutsideRef.current = el;
            }}
            onFocus={(event) => {
              const referenceEl = referenceElement();
              if (referenceEl && isOutsideEvent(event, referenceEl)) {
                const elementToFocus =
                  afterInsideRef.current && isTabbable(afterInsideRef.current)
                    ? afterInsideRef.current
                    : triggerElement();
                elementToFocus?.focus();
              } else {
                const nextTabbable = getNextTabbable(triggerElement()!);
                nextTabbable?.focus();

                if (!contains(rootRef.current, nextTabbable)) {
                  setValue(null, createChangeEventDetails(REASONS.focusOut, event));
                }
              }
            }}
          />
        </>
      </Show>
    </>
  );
}

export interface NavigationMenuTriggerState {
  /**
   * If `true`, the popup is open and the item is active.
   */
  open: boolean;
}

export interface NavigationMenuTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NavigationMenuTrigger.State> {}

export namespace NavigationMenuTrigger {
  export type State = NavigationMenuTriggerState;
  export type Props = NavigationMenuTriggerProps;
}
