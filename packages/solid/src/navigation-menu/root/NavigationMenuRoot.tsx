import { isHTMLElement } from '@floating-ui/utils/dom';
import { batch, createEffect, createMemo, createSignal, on, Show, splitProps } from 'solid-js';
import {
  FloatingTree,
  useFloatingNodeId,
  useFloatingParentNodeId,
  type FloatingRootContext,
} from '../../floating-ui-solid';
import { activeElement, contains } from '../../floating-ui-solid/utils';
import { splitComponentProps, useRef, type ReactLikeRef } from '../../solid-helpers';
import { type BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { ownerDocument } from '../../utils/owner';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps } from '../../utils/types';
import { useControlled } from '../../utils/useControlled';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTransitionStatus } from '../../utils/useTransitionStatus';
import { setFixedSize } from '../utils/setFixedSize';
import {
  NavigationMenuRootContext,
  NavigationMenuTreeContext,
  useNavigationMenuRootContext,
} from './NavigationMenuRootContext';

const blockedReturnFocusReasons = new Set<string>([
  REASONS.triggerHover,
  REASONS.outsidePress,
  REASONS.focusOut,
]);

/**
 * Groups all parts of the navigation menu.
 * Renders a `<nav>` element at the root, or `<div>` element when nested.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuRoot(componentProps: NavigationMenuRoot.Props) {
  const [local] = splitProps(componentProps, [
    'defaultValue',
    'value',
    'onValueChange',
    'actionsRef',
    'delay',
    'closeDelay',
    'orientation',
    'onOpenChangeComplete',
  ]);
  const defaultValue = () => local.defaultValue ?? null;
  const valueParam = () => local.value;
  const delay = () => local.delay ?? 50;
  const closeDelay = () => local.closeDelay ?? 50;
  const orientation = () => local.orientation ?? 'horizontal';

  const nested = createMemo(() => useFloatingParentNodeId() != null);

  const [value, setValueUnwrapped] = useControlled({
    controlled: valueParam,
    default: defaultValue,
    name: 'NavigationMenu',
    state: 'value',
  });

  // Derive open state from value being non-nullish
  const open = createMemo(() => value() != null);

  const [positionerElement, setPositionerElement] = createSignal<HTMLElement | null | undefined>(
    null,
  );
  const [popupElement, setPopupElement] = createSignal<HTMLElement | null | undefined>(null);
  const [viewportElement, setViewportElement] = createSignal<HTMLElement | null | undefined>(null);
  const [viewportTargetElement, setViewportTargetElement] = createSignal<
    HTMLElement | null | undefined
  >(null);
  const [activationDirection, setActivationDirection] =
    createSignal<ReturnType<NavigationMenuRootContext['setActivationDirection']>>(null);
  const [floatingRootContext, setFloatingRootContext] = createSignal<FloatingRootContext>();
  const [viewportInert, setViewportInert] = createSignal(false);

  const closeReasonRef = useRef<NavigationMenuRoot.ChangeEventReason | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const prevTriggerElementRef = useRef<Element | null | undefined>(null);
  const currentContentRef = useRef<HTMLDivElement | null>(null);
  const beforeInsideRef = useRef<HTMLSpanElement | null>(null);
  const afterInsideRef = useRef<HTMLSpanElement | null>(null);
  const beforeOutsideRef = useRef<HTMLSpanElement | null>(null);
  const afterOutsideRef = useRef<HTMLSpanElement | null>(null);

  const { transitionStatus, setMounted, mounted } = useTransitionStatus(() => open());

  createEffect(
    on(value, () => {
      setViewportInert(false);
    }),
  );

  const setValue = (nextValue: any, eventDetails: NavigationMenuRoot.ChangeEventDetails) => {
    batch(() => {
      if (!nextValue) {
        closeReasonRef.current = eventDetails.reason;
        setActivationDirection(null);
        setFloatingRootContext(undefined);

        if (positionerElement() && popupElement()) {
          setFixedSize(popupElement()!, 'popup');
          setFixedSize(positionerElement()!, 'positioner');
        }
      }

      if (nextValue !== value()) {
        local.onValueChange?.(nextValue, eventDetails);
      }

      if (eventDetails.isCanceled) {
        return;
      }

      setValueUnwrapped(nextValue);
    });
  };

  const handleUnmount = () => {
    const doc = ownerDocument(rootRef.current ?? null);
    const activeEl = activeElement(doc);

    const isReturnFocusBlocked = closeReasonRef.current
      ? blockedReturnFocusReasons.has(closeReasonRef.current)
      : false;

    const popupEl = popupElement() ?? null;
    if (
      !isReturnFocusBlocked &&
      isHTMLElement(prevTriggerElementRef.current) &&
      (activeEl === ownerDocument(popupEl).body || contains(popupEl, activeEl)) &&
      popupEl
    ) {
      prevTriggerElementRef.current.focus({ preventScroll: true });
      prevTriggerElementRef.current = undefined;
    }
    batch(() => {
      setMounted(false);
      local.onOpenChangeComplete?.(false);
      setActivationDirection(null);
      setFloatingRootContext(undefined);
    });
    currentContentRef.current = null;
    closeReasonRef.current = undefined;
  };

  useOpenChangeComplete({
    enabled: () => !local.actionsRef,
    open,
    ref: popupElement,
    onComplete() {
      if (!open()) {
        handleUnmount();
      }
    },
  });

  useOpenChangeComplete({
    enabled: () => !local.actionsRef,
    open,
    ref: viewportTargetElement,
    onComplete() {
      if (!open()) {
        handleUnmount();
      }
    },
  });

  const contextValue: NavigationMenuRootContext = {
    open,
    value,
    setValue,
    mounted,
    transitionStatus,
    positionerElement,
    setPositionerElement,
    popupElement,
    setPopupElement,
    viewportElement,
    setViewportElement,
    viewportTargetElement,
    setViewportTargetElement,
    activationDirection,
    setActivationDirection,
    floatingRootContext,
    setFloatingRootContext,
    nested,
    rootRef,
    prevTriggerElementRef,
    currentContentRef,
    beforeInsideRef,
    afterInsideRef,
    beforeOutsideRef,
    afterOutsideRef,
    delay,
    closeDelay,
    orientation,
    viewportInert,
    setViewportInert,
  };

  const element = () => (
    <NavigationMenuRootContext.Provider value={contextValue}>
      <TreeContext {...componentProps} />
    </NavigationMenuRootContext.Provider>
  );

  return (
    <Show when={nested()} fallback={<FloatingTree>{element()}</FloatingTree>}>
      {element()}
    </Show>
  );
}

function TreeContext(componentProps: NavigationMenuRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'defaultValue',
    'value',
    'onValueChange',
    'actionsRef',
    'delay',
    'closeDelay',
    'orientation',
    'onOpenChangeComplete',
  ]);

  const nodeId = useFloatingNodeId();

  const { rootRef, nested } = useNavigationMenuRootContext();

  const { open } = useNavigationMenuRootContext();

  const state: NavigationMenuRoot.State = {
    get open() {
      return open();
    },
    get nested() {
      return nested();
    },
  };

  const element = useRenderElement(() => (nested() ? 'div' : 'nav'), componentProps, {
    state,
    ref: (el: any) => {
      rootRef.current = el;
    },
    props: [
      {
        get 'aria-orientation'() {
          return local.orientation;
        },
      },
      elementProps,
    ],
  });

  return (
    <NavigationMenuTreeContext.Provider value={nodeId}>
      {element()}
    </NavigationMenuTreeContext.Provider>
  );
}

export interface NavigationMenuRootState {
  /**
   * If `true`, the popup is open.
   */
  open: boolean;
  /**
   * Whether the navigation menu is nested.
   */
  nested: boolean;
}

export interface NavigationMenuRootProps extends BaseUIComponentProps<
  'nav',
  NavigationMenuRoot.State
> {
  /**
   * A ref to imperative actions.
   */
  actionsRef?: ReactLikeRef<NavigationMenuRoot.Actions | null> | undefined;
  /**
   * Event handler called after any animations complete when the navigation menu is closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * The controlled value of the navigation menu item that should be currently open.
   * When non-nullish, the menu will be open. When nullish, the menu will be closed.
   *
   * To render an uncontrolled navigation menu, use the `defaultValue` prop instead.
   * @default null
   */
  value?: any;
  /**
   * The uncontrolled value of the item that should be initially selected.
   *
   * To render a controlled navigation menu, use the `value` prop instead.
   * @default null
   */
  defaultValue?: any;
  /**
   * Callback fired when the value changes.
   */
  onValueChange?:
    | ((value: any, eventDetails: NavigationMenuRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * How long to wait before opening the navigation menu. Specified in milliseconds.
   * @default 50
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the navigation menu. Specified in milliseconds.
   * @default 50
   */
  closeDelay?: number | undefined;
  /**
   * The orientation of the navigation menu.
   * @default 'horizontal'
   */
  orientation?: ('horizontal' | 'vertical') | undefined;
}

export interface NavigationMenuRootActions {
  unmount: () => void;
}

export type NavigationMenuRootChangeEventReason =
  | typeof REASONS.triggerPress
  | typeof REASONS.triggerHover
  | typeof REASONS.outsidePress
  | typeof REASONS.listNavigation
  | typeof REASONS.focusOut
  | typeof REASONS.escapeKey
  | typeof REASONS.linkPress
  | typeof REASONS.none;

export type NavigationMenuRootChangeEventDetails =
  BaseUIChangeEventDetails<NavigationMenuRoot.ChangeEventReason>;

export namespace NavigationMenuRoot {
  export type State = NavigationMenuRootState;
  export type Props = NavigationMenuRootProps;
  export type Actions = NavigationMenuRootActions;
  export type ChangeEventReason = NavigationMenuRootChangeEventReason;
  export type ChangeEventDetails = NavigationMenuRootChangeEventDetails;
}
