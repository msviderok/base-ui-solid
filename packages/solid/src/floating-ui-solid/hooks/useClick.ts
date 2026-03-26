import { defaultProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { useAnimationFrame } from '../../utils/useAnimationFrame';
import { useTimeout } from '../../utils/useTimeout';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import { isClickLikeEvent, isMouseLikePointerType, isTypeableElement } from '../utils';

export interface UseClickProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * The type of event to use to determine a “click” with mouse input.
   * Keyboard clicks work as normal.
   * @default 'click'
   */
  event?: ('click' | 'mousedown' | 'mousedown-only') | undefined;
  /**
   * Whether to toggle the open state with repeated clicks.
   * @default true
   */
  toggle?: boolean | undefined;
  /**
   * Whether to ignore the logic for mouse input (for example, if `useHover()`
   * is also being used).
   * @default false
   */
  ignoreMouse?: boolean | undefined;
  /**
   * If already open from another event such as the `useHover()` Hook,
   * determines whether to keep the floating element open when clicking the
   * reference element for the first time.
   * @default true
   */
  stickIfOpen?: boolean | undefined;
  /**
   * Touch-only delay (ms) before opening. Useful to allow mobile viewport/keyboard to settle.
   * @default 0
   */
  touchOpenDelay?: number | undefined;
  /**
   * The reason for the click.
   * @default REASONS.triggerPress
   */
  reason?: (typeof REASONS.triggerPress | typeof REASONS.inputPress) | undefined;
}

/**
 * Opens or closes the floating element when clicking the reference element.
 * @see https://floating-ui.com/docs/useClick
 */
export function useClick(parameters: {
  context: FloatingRootContext | FloatingContext;
  props?: UseClickProps;
}): ElementProps {
  const props = defaultProps(parameters.props ?? {}, {
    enabled: true,
    event: 'click',
    toggle: true,
    ignoreMouse: false,
    stickIfOpen: true,
    touchOpenDelay: 0,
    reason: REASONS.triggerPress,
  });

  const store = () => {
    const context = parameters.context;
    return 'rootStore' in context ? context.rootStore : context;
  };
  const dataRef = () => store().context.dataRef;

  let pointerTypeRef: 'mouse' | 'pen' | 'touch' | undefined | ({} & string);
  const frame = useAnimationFrame();
  const touchOpenTimeout = useTimeout();

  const reference: ElementProps['reference'] = {
    onPointerDown: (event) => {
      pointerTypeRef = event.pointerType;
    },
    onMouseDown: (event) => {
      const pointerType = pointerTypeRef;
      const open = store().state.open;

      // Ignore all buttons except for the "main" button.
      // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
      if (
        event.button !== 0 ||
        props.event === 'click' ||
        (isMouseLikePointerType(pointerType, true) && props.ignoreMouse)
      ) {
        return;
      }

      const openEvent = dataRef().openEvent;
      const openEventType = openEvent?.type;
      const hasClickedOnInactiveTrigger = store().state.domReferenceElement !== event.currentTarget;
      const nextOpen =
        (open && hasClickedOnInactiveTrigger) ||
        !(
          open &&
          props.toggle &&
          (openEvent && props.stickIfOpen
            ? openEventType === 'click' || openEventType === 'mousedown'
            : true)
        );

      // Animations sometimes won't run on a typeable element if using a rAF.
      // Focus is always set on these elements. For touch, we may delay opening.
      if (isTypeableElement(event.target)) {
        const details = createChangeEventDetails(props.reason, event, event.target as HTMLElement);
        const fn = () => store().setOpen(true, details);
        if (nextOpen && pointerType === 'touch' && props.touchOpenDelay > 0) {
          touchOpenTimeout.start(props.touchOpenDelay, fn);
        } else {
          store().setOpen(nextOpen, details);
        }
        return;
      }

      // Capture the currentTarget before the rAF.
      // as React sets it to null after the event handler completes.
      const eventCurrentTarget = event.currentTarget as HTMLElement;

      // Wait until focus is set on the element. This is an alternative to
      // `event.preventDefault()` to avoid :focus-visible from appearing when using a pointer.

      frame.request(() => {
        const details = createChangeEventDetails(props.reason, event, eventCurrentTarget);
        const fn = () => store().setOpen(true, details);
        if (nextOpen && pointerType === 'touch' && props.touchOpenDelay > 0) {
          touchOpenTimeout.start(props.touchOpenDelay, fn);
        } else {
          store().setOpen(nextOpen, details);
        }
      });
    },
    onClick: (event) => {
      if (props.event === 'mousedown-only') {
        return;
      }

      const pointerType = pointerTypeRef;

      if (props.event === 'mousedown' && pointerType) {
        pointerTypeRef = undefined;
        return;
      }

      if (isMouseLikePointerType(pointerType, true) && props.ignoreMouse) {
        return;
      }

      const open = store().state.open;
      const openEvent = dataRef().openEvent;
      const fallbackReferenceElement =
        openEvent?.target instanceof Element ? openEvent.target : null;
      const referenceElement = store().state.domReferenceElement ?? fallbackReferenceElement;
      const hasClickedOnInactiveTrigger = referenceElement !== event.currentTarget;
      const nextOpen =
        (open && hasClickedOnInactiveTrigger) ||
        !(
          open &&
          props.toggle &&
          (openEvent && props.stickIfOpen ? isClickLikeEvent(openEvent) : true)
        );
      const details = createChangeEventDetails(
        props.reason,
        event,
        event.currentTarget as HTMLElement,
      );

      if (nextOpen && pointerType === 'touch' && props.touchOpenDelay > 0) {
        touchOpenTimeout.start(props.touchOpenDelay, () => {
          store().setOpen(true, details);
        });
      } else {
        store().setOpen(nextOpen, details);
      }
    },
    onKeyDown: () => {
      pointerTypeRef = undefined;
    },
  };

  return {
    get reference() {
      return props.enabled ? reference : undefined;
    },
  };
}
