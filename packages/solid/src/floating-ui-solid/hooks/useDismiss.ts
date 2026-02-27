import { ownerDocument } from '@base-ui/utils/owner';
import { getOverflowAncestors } from '@floating-ui/dom';
import {
  getComputedStyle,
  getParentNode,
  isElement,
  isHTMLElement,
  isLastTraversableNode,
  isWebKit,
} from '@floating-ui/utils/dom';
import { createEffect, createMemo, on, onCleanup } from 'solid-js';
import { access, defaultProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { useTimeout } from '../../utils/useTimeout';
import { useFloatingTree } from '../components/FloatingTree';
import { FloatingTreeStore } from '../components/FloatingTreeStore';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import {
  contains,
  getNodeChildren,
  getTarget,
  isEventTargetInsidePortal,
  isEventTargetWithin,
  isRootElement,
} from '../utils';
import { createAttribute } from '../utils/createAttribute';

type PressType = 'intentional' | 'sloppy';

const bubbleHandlerKeys = {
  intentional: 'onClick',
  sloppy: 'onPointerDown',
} as const;

export function normalizeProp(
  normalizable?: boolean | { escapeKey?: boolean | undefined; outsidePress?: boolean | undefined },
) {
  return {
    escapeKey:
      typeof normalizable === 'boolean' ? normalizable : (normalizable?.escapeKey ?? false),
    outsidePress:
      typeof normalizable === 'boolean' ? normalizable : (normalizable?.outsidePress ?? true),
  };
}

export interface UseDismissProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Whether to dismiss the floating element upon pressing the `esc` key.
   * @default true
   */
  escapeKey?: boolean | undefined;
  /**
   * Whether to dismiss the floating element upon pressing the reference
   * element. You likely want to ensure the `move` option in the `useHover()`
   * Hook has been disabled when this is in use.
   * @default false
   */
  referencePress?: boolean | undefined;
  /**
   * The type of event to use to determine a "press".
   * - `down` is `pointerdown` on mouse input, but special iOS-like touch handling on touch input.
   * - `up` is lazy on both mouse + touch input (equivalent to `click`).
   * @default 'down'
   */
  referencePressEvent?: PressType | undefined;
  /**
   * Whether to dismiss the floating element upon pressing outside of the
   * floating element.
   * If you have another element, like a toast, that is rendered outside the
   * floating element's Solid tree and don't want the floating element to close
   * when pressing it, you can guard the check like so:
   * ```jsx
   * useDismiss(context, {
   *   outsidePress: (event) => !event.target.closest('.toast'),
   * });
   * ```
   * @default true
   */
  outsidePress?: boolean | ((event: MouseEvent | TouchEvent) => boolean) | undefined;
  /**
   * The type of event to use to determine an outside "press".
   * - `intentional` requires the user to click outside intentionally, firing on `pointerup` for mouse, and requiring minimal `touchmove`s for touch.
   * - `sloppy` fires on `pointerdown` for mouse, while for touch it fires on `touchend` (within 1 second) or while scrolling away after `touchstart`.
   */
  outsidePressEvent?:
    | (
        | PressType
        | {
            mouse: PressType;
            touch: PressType;
          }
        | (() =>
            | PressType
            | {
                mouse: PressType;
                touch: PressType;
              })
      )
    | undefined;

  /**
   * Whether to dismiss the floating element upon scrolling an overflow
   * ancestor.
   * @default false
   */
  ancestorScroll?: boolean | undefined;
  /**
   * Determines whether event listeners bubble upwards through a tree of
   * floating elements.
   */
  bubbles?:
    | boolean
    | { escapeKey?: boolean | undefined; outsidePress?: boolean | undefined }
    | undefined;
  /**
   * External FlatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
}

/**
 * Closes the floating element when a dismissal is requested — by default, when
 * the user presses the `escape` key or outside of the floating element.
 * @see https://floating-ui.com/docs/useDismiss
 */
export function useDismiss(parameters: {
  context: FloatingRootContext | FloatingContext;
  props?: UseDismissProps;
}): ElementProps {
  const props = defaultProps(parameters.props ?? {}, {
    enabled: true,
    escapeKey: true,
    outsidePress: true,
    outsidePressEvent: 'sloppy',
    referencePress: false,
    referencePressEvent: 'sloppy',
    ancestorScroll: false,
  });

  const store = createMemo(() =>
    'rootStore' in parameters.context ? parameters.context.rootStore : parameters.context,
  );
  const dataRef = () => store().context.dataRef;
  const open = createMemo(() => store().select('open'));
  const floatingElement = createMemo(() => store().select('floatingElement'));
  const referenceElement = createMemo(() => store().select('referenceElement'));
  const domReferenceElement = createMemo(() => store().select('domReferenceElement'));

  const bubbles = createMemo(() => normalizeProp(props.bubbles));

  const tree = useFloatingTree(props.externalTree);
  const outsidePress = createMemo(() => {
    // If it's an event callback
    if (typeof props.outsidePress === 'function') {
      return props.outsidePress;
    }

    return props.outsidePress ?? true;
  });

  let endedOrStartedInsideRef = false;

  let touchStateRef = null as {
    startTime: number;
    startX: number;
    startY: number;
    dismissOnTouchEnd: boolean;
    dismissOnMouseDown: boolean;
  } | null;

  const cancelDismissOnEndTimeout = useTimeout();
  const clearinsidePortalTimeout = useTimeout();

  const clearinsidePortal = () => {
    clearinsidePortalTimeout.clear();
    dataRef().insidePortal = false;
  };

  let isComposingRef = false;
  let currentPointerTypeRef: PointerEvent['pointerType'] = '';

  const trackPointerType = (event: PointerEvent) => {
    currentPointerTypeRef = event.pointerType;
  };

  const getOutsidePressEvent = () => {
    const type = currentPointerTypeRef as 'pen' | 'mouse' | 'touch' | '';
    const computedType = type === 'pen' || !type ? 'mouse' : type;

    const resolved =
      typeof props.outsidePressEvent === 'function'
        ? props.outsidePressEvent()
        : props.outsidePressEvent;

    if (typeof resolved === 'string') {
      return resolved;
    }

    return resolved[computedType];
  };

  const closeOnEscapeKeyDown = (event: KeyboardEvent) => {
    if (!event.currentTarget) {
      return;
    }

    if (!open() || !props.enabled || !props.escapeKey || event.key !== 'Escape') {
      return;
    }

    // Wait until IME is settled. Pressing `Escape` while composing should
    // close the compose menu, but not the floating element.
    if (isComposingRef) {
      return;
    }

    const nodeId = dataRef().floatingContext?.nodeId();

    const children = tree ? getNodeChildren(tree.nodesRef, nodeId) : [];

    let shouldDismiss = true;
    if (children.length > 0) {
      for (const child of children) {
        if (child.context?.open() && !child.context.dataRef.__escapeKeyBubbles) {
          shouldDismiss = false;
          break;
        }
      }
    }

    if (!shouldDismiss) {
      return;
    }

    dataRef().__closing = true;

    const eventDetails = createChangeEventDetails(REASONS.escapeKey, event);

    store().setOpen(false, eventDetails);

    if (!bubbles().escapeKey && !eventDetails.isPropagationAllowed) {
      event.stopImmediatePropagation();
    }
  };

  const shouldIgnoreEvent = (event: Event) => {
    const computedOutsidePressEvent = getOutsidePressEvent();
    return (
      (computedOutsidePressEvent === 'intentional' && event.type !== 'click') ||
      (computedOutsidePressEvent === 'sloppy' && event.type === 'click')
    );
  };

  const markinsidePortal = () => {
    dataRef().insidePortal = true;
    clearinsidePortalTimeout.start(0, clearinsidePortal);
  };

  const closeOnPressOutside = (
    event: MouseEvent | PointerEvent | TouchEvent,
    endedOrStartedInside = false,
  ) => {
    // TODO SOLID CHECK
    // // TODO: explanation
    // if (!capture().outsidePress && event.cancelBubble) {
    //   return;
    // }
    if (shouldIgnoreEvent(event)) {
      clearinsidePortal();
      return;
    }

    if (dataRef().insidePortal) {
      clearinsidePortal();
      return;
    }

    if (isEventTargetInsidePortal(event)) {
      dataRef().insidePortal = true;
      /**
       * TODO: explain this properly
       * If the target is inside a portal OR its dismisal is managed externally then don't dismiss here
       */
      const managed = (event.target as HTMLElement)?.hasAttribute(createAttribute('managed'));

      if (!tree && !managed) {
        return;
      }
    }

    if (getOutsidePressEvent() === 'intentional' && endedOrStartedInside) {
      return;
    }

    const resolvedOutsidePress = outsidePress();
    if (typeof resolvedOutsidePress === 'function' && !resolvedOutsidePress(event)) {
      return;
    }

    const target = getTarget(event);
    const inertSelector = `[${createAttribute('inert')}]`;
    const markers = ownerDocument(store().select('floatingElement') ?? null).querySelectorAll(
      inertSelector,
    );

    const triggers = store().context.triggerElements;

    // If another trigger is clicked, don't close the floating element.
    if (
      target &&
      (triggers.hasElement(target as Element) ||
        triggers.hasMatchingElement((trigger) => contains(trigger, target as Element)))
    ) {
      return;
    }

    let targetRootAncestor = isElement(target) ? target : null;
    while (targetRootAncestor && !isLastTraversableNode(targetRootAncestor)) {
      const nextParent = getParentNode(targetRootAncestor);
      if (isLastTraversableNode(nextParent) || !isElement(nextParent)) {
        break;
      }

      targetRootAncestor = nextParent;
    }

    // Check if the click occurred on a third-party element injected after the
    // floating element rendered.
    if (
      markers.length &&
      isElement(target) &&
      !isRootElement(target) &&
      // Clicked on a direct ancestor (e.g. FloatingOverlay).
      !contains(target, floatingElement()) &&
      // If the target root element contains none of the markers, then the
      // element was injected after the floating element rendered.
      Array.from(markers).every((marker) => !contains(targetRootAncestor, marker))
    ) {
      return;
    }

    // Check if the click occurred on the scrollbar
    // Skip for touch events: scrollbars don't receive touch events on most platforms
    if (isHTMLElement(target) && !('touches' in event)) {
      const lastTraversableNode = isLastTraversableNode(target);
      const style = getComputedStyle(target);
      const scrollRe = /auto|scroll/;
      const isScrollableX = lastTraversableNode || scrollRe.test(style.overflowX);
      const isScrollableY = lastTraversableNode || scrollRe.test(style.overflowY);

      const canScrollX =
        isScrollableX && target.clientWidth > 0 && target.scrollWidth > target.clientWidth;
      const canScrollY =
        isScrollableY && target.clientHeight > 0 && target.scrollHeight > target.clientHeight;

      const isRTL = style.direction === 'rtl';

      // Check click position relative to scrollbar.
      // In some browsers it is possible to change the <body> (or window)
      // scrollbar to the left side, but is very rare and is difficult to
      // check for. Plus, for modal dialogs with backdrops, it is more
      // important that the backdrop is checked but not so much the window.
      const pressedVerticalScrollbar =
        canScrollY &&
        (isRTL
          ? event.offsetX <= target.offsetWidth - target.clientWidth
          : event.offsetX > target.clientWidth);

      const pressedHorizontalScrollbar = canScrollX && event.offsetY > target.clientHeight;

      if (pressedVerticalScrollbar || pressedHorizontalScrollbar) {
        return;
      }
    }

    const nodeId = dataRef().floatingContext?.nodeId();

    const targetIsInsideChildren =
      tree &&
      getNodeChildren(tree.nodesRef, nodeId).some((node) =>
        isEventTargetWithin(event, node.context?.elements.floating()),
      );

    if (
      isEventTargetWithin(event, floatingElement()) ||
      isEventTargetWithin(event, domReferenceElement()) ||
      targetIsInsideChildren
    ) {
      return;
    }

    const children = tree ? getNodeChildren(tree.nodesRef, nodeId) : [];

    if (children.length > 0) {
      let shouldDismiss = true;

      children.forEach((child) => {
        const childContext = access(child.context);
        if (childContext?.open() && !childContext.dataRef.__outsidePressBubbles) {
          shouldDismiss = false;
        }
      });

      if (!shouldDismiss) {
        return;
      }
    }

    store().setOpen(false, createChangeEventDetails(REASONS.outsidePress, event));
    clearinsidePortal();
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (
      getOutsidePressEvent() !== 'sloppy' ||
      event.pointerType === 'touch' ||
      !open() ||
      !props.enabled ||
      isEventTargetWithin(event, floatingElement()) ||
      isEventTargetWithin(event, domReferenceElement())
    ) {
      return;
    }

    closeOnPressOutside(event);
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (
      getOutsidePressEvent() !== 'sloppy' ||
      !open() ||
      !props.enabled ||
      isEventTargetWithin(event, floatingElement()) ||
      isEventTargetWithin(event, domReferenceElement())
    ) {
      return;
    }

    const touch = event.touches[0];
    if (touch) {
      touchStateRef = {
        startTime: Date.now(),
        startX: touch.clientX,
        startY: touch.clientY,
        dismissOnTouchEnd: false,
        dismissOnMouseDown: true,
      };

      cancelDismissOnEndTimeout.start(1000, () => {
        if (touchStateRef) {
          touchStateRef.dismissOnTouchEnd = false;
          touchStateRef.dismissOnMouseDown = false;
        }
      });
    }
  };

  const handleTouchStartCapture = (event: TouchEvent) => {
    const target = getTarget(event);
    function callback() {
      handleTouchStart(event);
      target?.removeEventListener(event.type, callback);
    }
    target?.addEventListener(event.type, callback);
  };

  const closeOnPressOutsideCapture = (event: PointerEvent | MouseEvent) => {
    // When click outside is lazy (`up` event), handle dragging.
    // Don't close if:
    // - The click started inside the floating element.
    // - The click ended inside the floating element.
    const endedOrStartedInside = endedOrStartedInsideRef;
    endedOrStartedInsideRef = false;

    cancelDismissOnEndTimeout.clear();

    if (event.type === 'mousedown' && touchStateRef && !touchStateRef.dismissOnMouseDown) {
      return;
    }

    const target = getTarget(event);

    function callback() {
      if (event.type === 'pointerdown') {
        handlePointerDown(event as PointerEvent);
      } else {
        closeOnPressOutside(event as MouseEvent, endedOrStartedInside);
      }
      target?.removeEventListener(event.type, callback);
    }
    target?.addEventListener(event.type, callback);
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (
      getOutsidePressEvent() !== 'sloppy' ||
      !touchStateRef ||
      isEventTargetWithin(event, floatingElement()) ||
      isEventTargetWithin(event, domReferenceElement())
    ) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const deltaX = Math.abs(touch.clientX - touchStateRef.startX);
    const deltaY = Math.abs(touch.clientY - touchStateRef.startY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 5) {
      touchStateRef.dismissOnTouchEnd = true;
    }

    if (distance > 10) {
      closeOnPressOutside(event);
      cancelDismissOnEndTimeout.clear();
      touchStateRef = null;
    }
  };

  const handleTouchMoveCapture = (event: TouchEvent) => {
    const target = getTarget(event);
    function callback() {
      handleTouchMove(event);
      target?.removeEventListener(event.type, callback);
    }
    target?.addEventListener(event.type, callback);
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (
      getOutsidePressEvent() !== 'sloppy' ||
      !touchStateRef ||
      isEventTargetWithin(event, floatingElement()) ||
      isEventTargetWithin(event, domReferenceElement())
    ) {
      return;
    }

    if (touchStateRef.dismissOnTouchEnd) {
      closeOnPressOutside(event);
    }

    cancelDismissOnEndTimeout.clear();
    touchStateRef = null;
  };

  const handleTouchEndCapture = (event: TouchEvent) => {
    const target = getTarget(event);
    function callback() {
      handleTouchEnd(event);
      target?.removeEventListener(event.type, callback);
    }
    target?.addEventListener(event.type, callback);
  };

  createEffect(() => {
    if (!open() || !props.enabled) {
      return;
    }

    dataRef().__escapeKeyBubbles = bubbles().escapeKey;
    dataRef().__outsidePressBubbles = bubbles().outsidePress;

    const compositionTimeout = useTimeout();

    function onScroll(event: Event) {
      store().setOpen(false, createChangeEventDetails(REASONS.none, event));
    }

    function handleCompositionStart() {
      compositionTimeout.clear();
      isComposingRef = true;
    }

    function handleCompositionEnd() {
      // Safari fires `compositionend` before `keydown`, so we need to wait
      // until the next tick to set `isComposing` to `false`.
      // https://bugs.webkit.org/show_bug.cgi?id=165004
      compositionTimeout.start(
        // 0ms or 1ms don't work in Safari. 5ms appears to consistently work.
        // Only apply to WebKit for the test to remain 0ms.
        isWebKit() ? 5 : 0,
        () => {
          isComposingRef = false;
        },
      );
    }

    const floating = floatingElement();
    const doc = ownerDocument(floating ?? null);

    doc.addEventListener('pointerdown', trackPointerType, true);

    if (props.escapeKey) {
      doc.addEventListener('keydown', closeOnEscapeKeyDown);
      doc.addEventListener('compositionstart', handleCompositionStart);
      doc.addEventListener('compositionend', handleCompositionEnd);
      onCleanup(() => {
        doc.removeEventListener('keydown', closeOnEscapeKeyDown);
        doc.removeEventListener('compositionstart', handleCompositionStart);
        doc.removeEventListener('compositionend', handleCompositionEnd);
      });
    }

    if (outsidePress()) {
      doc.addEventListener('click', closeOnPressOutsideCapture, true);
      doc.addEventListener('pointerdown', closeOnPressOutsideCapture, true);
      doc.addEventListener('touchstart', handleTouchStartCapture, true);
      doc.addEventListener('touchmove', handleTouchMoveCapture, true);
      doc.addEventListener('touchend', handleTouchEndCapture, true);
      doc.addEventListener('mousedown', closeOnPressOutsideCapture, true);
      onCleanup(() => {
        doc.removeEventListener('click', closeOnPressOutsideCapture, true);
        doc.removeEventListener('pointerdown', closeOnPressOutsideCapture, true);
        doc.removeEventListener('touchstart', handleTouchStartCapture, true);
        doc.removeEventListener('touchmove', handleTouchMoveCapture, true);
        doc.removeEventListener('touchend', handleTouchEndCapture, true);
        doc.removeEventListener('mousedown', closeOnPressOutsideCapture, true);
      });
    }

    let ancestors: (Element | Window | VisualViewport)[] = [];

    if (props.ancestorScroll) {
      const domReference = domReferenceElement();
      if (isElement(domReference)) {
        ancestors = getOverflowAncestors(domReference);
      }

      const floatingEl = floatingElement();
      if (isElement(floatingEl)) {
        ancestors = ancestors.concat(getOverflowAncestors(floatingEl));
      }

      const reference = referenceElement();
      if (!isElement(reference) && reference && reference.contextElement) {
        ancestors = ancestors.concat(getOverflowAncestors(reference.contextElement));
      }
    }

    // Ignore the visual viewport for scrolling dismissal (allow pinch-zoom)
    ancestors
      .filter((ancestor) => ancestor !== doc.defaultView?.visualViewport)
      .forEach((ancestor) => {
        ancestor.addEventListener('scroll', onScroll, { passive: true });
        onCleanup(() => ancestor.removeEventListener('scroll', onScroll));
      });

    onCleanup(() => {
      compositionTimeout.clear();
      endedOrStartedInsideRef = false;
    });
  });

  createEffect(on(outsidePress, clearinsidePortal));

  const reference = createMemo<ElementProps['reference']>(() => ({
    onKeyDown: closeOnEscapeKeyDown,
    ...(props.referencePress && {
      [bubbleHandlerKeys[props.referencePressEvent]](event: Event) {
        store().setOpen(false, createChangeEventDetails(REASONS.triggerPress, event as any));
      },
      ...(props.referencePressEvent !== 'intentional' && {
        onClick(event) {
          store().setOpen(false, createChangeEventDetails(REASONS.triggerPress, event));
        },
      }),
    }),
  }));

  const handlePressedInside = (event: MouseEvent) => {
    const target = getTarget(event) as Element | null;
    if (!contains(floatingElement(), target) || event.button !== 0) {
      return;
    }
    endedOrStartedInsideRef = true;
  };

  const markPressStartedinsidePortal = (event: PointerEvent | MouseEvent) => {
    if (!open() || !props.enabled || event.button !== 0) {
      return;
    }
    endedOrStartedInsideRef = true;
  };

  const floating: ElementProps['floating'] = {
    onKeyDown: closeOnEscapeKeyDown,

    // `onMouseDown` may be blocked if `event.preventDefault()` is called in
    // `onPointerDown`, such as with <NumberField.ScrubArea>.
    // See https://github.com/mui/base-ui/pull/3379
    onPointerDown: handlePressedInside,
    onMouseDown: handlePressedInside,
    onMouseUp: handlePressedInside,

    'on:click': {
      capture: true,
      handleEvent: markinsidePortal,
    },
    'on:mousedown': {
      capture: true,
      handleEvent: (event) => {
        markinsidePortal();
        markPressStartedinsidePortal(event);
      },
    },
    'on:pointerdown': {
      capture: true,
      handleEvent: (event) => {
        markinsidePortal();
        markPressStartedinsidePortal(event as PointerEvent);
      },
    },
    'on:mouseup': {
      capture: true,
      handleEvent: markinsidePortal,
    },
    'on:touchend': {
      capture: true,
      handleEvent: markinsidePortal,
    },
    'on:touchmove': {
      capture: true,
      handleEvent: markinsidePortal,
    },
  };

  return {
    get reference() {
      return props.enabled ? reference() : undefined;
    },
    get floating() {
      return props.enabled ? floating : undefined;
    },
    get trigger() {
      return props.enabled ? reference() : undefined;
    },
  };
}
