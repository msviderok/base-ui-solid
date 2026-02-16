import { createMemo, type Accessor } from 'solid-js';
import { access, type MaybeAccessor } from '../../solid-helpers';
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
  enabled?: MaybeAccessor<boolean | undefined>;
  /**
   * The type of event to use to determine a “click” with mouse input.
   * Keyboard clicks work as normal.
   * @default 'click'
   */
  event?: MaybeAccessor<('click' | 'mousedown' | 'mousedown-only') | undefined>;
  /**
   * Whether to toggle the open state with repeated clicks.
   * @default true
   */
  toggle?: MaybeAccessor<boolean | undefined>;
  /**
   * Whether to ignore the logic for mouse input (for example, if `useHover()`
   * is also being used).
   * @default false
   */
  ignoreMouse?: MaybeAccessor<boolean | undefined>;
  /**
   * If already open from another event such as the `useHover()` Hook,
   * determines whether to keep the floating element open when clicking the
   * reference element for the first time.
   * @default true
   */
  stickIfOpen?: MaybeAccessor<boolean | undefined>;
  /**
   * Touch-only delay (ms) before opening. Useful to allow mobile viewport/keyboard to settle.
   * @default 0
   */
  touchOpenDelay?: MaybeAccessor<number | undefined>;
  /**
   * The reason for the click.
   * @default REASONS.triggerPress
   */
  reason?: MaybeAccessor<(typeof REASONS.triggerPress | typeof REASONS.inputPress) | undefined>;
}

/**
 * Opens or closes the floating element when clicking the reference element.
 * @see https://floating-ui.com/docs/useClick
 */
export function useClick(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  props: UseClickProps = {},
): Accessor<ElementProps> {
  const context = () => access(contextProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const dataRef = () => store().context.dataRef;
  const enabled = () => access(props.enabled) ?? true;
  const eventOption = () => access(props.event) ?? 'click';
  const toggle = () => access(props.toggle) ?? true;
  const ignoreMouse = () => access(props.ignoreMouse) ?? false;
  const stickIfOpen = () => access(props.stickIfOpen) ?? true;
  const touchOpenDelay = () => access(props.touchOpenDelay) ?? 0;
  const reason = () => access(props.reason) ?? REASONS.triggerPress;

  let pointerTypeRef: 'mouse' | 'pen' | 'touch' | undefined | ({} & string);
  const frame = useAnimationFrame();
  const touchOpenTimeout = useTimeout();

  const reference = createMemo<ElementProps['reference']>(() => {
    return {
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
          eventOption() === 'click' ||
          (isMouseLikePointerType(pointerType, true) && ignoreMouse())
        ) {
          return;
        }

        const openEvent = dataRef().openEvent;
        const openEventType = openEvent?.type;
        const hasClickedOnInactiveTrigger =
          store().state.domReferenceElement !== event.currentTarget;
        const nextOpen =
          (open && hasClickedOnInactiveTrigger) ||
          !(
            open &&
            toggle() &&
            (openEvent && stickIfOpen()
              ? openEventType === 'click' || openEventType === 'mousedown'
              : true)
          );

        // Animations sometimes won't run on a typeable element if using a rAF.
        // Focus is always set on these elements. For touch, we may delay opening.
        if (isTypeableElement(event.target)) {
          const details = createChangeEventDetails(reason(), event, event.target as HTMLElement);
          if (nextOpen && pointerType === 'touch' && touchOpenDelay() > 0) {
            touchOpenTimeout.start(touchOpenDelay(), () => {
              store().setOpen(true, details);
            });
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
          const details = createChangeEventDetails(reason(), event, eventCurrentTarget);
          if (nextOpen && pointerType === 'touch' && touchOpenDelay() > 0) {
            touchOpenTimeout.start(touchOpenDelay(), () => {
              store().setOpen(true, details);
            });
          } else {
            store().setOpen(nextOpen, details);
          }
        });
      },
      onClick: (event) => {
        if (eventOption() === 'mousedown-only') {
          return;
        }

        const pointerType = pointerTypeRef;

        if (eventOption() === 'mousedown' && pointerType) {
          pointerTypeRef = undefined;
          return;
        }

        if (isMouseLikePointerType(pointerType, true) && ignoreMouse()) {
          return;
        }

        const open = store().state.open;
        const openEvent = dataRef().openEvent;
        const hasClickedOnInactiveTrigger =
          store().state.domReferenceElement !== event.currentTarget;
        const nextOpen =
          (open && hasClickedOnInactiveTrigger) ||
          !(open && toggle() && (openEvent && stickIfOpen() ? isClickLikeEvent(openEvent) : true));
        const details = createChangeEventDetails(
          reason(),
          event,
          event.currentTarget as HTMLElement,
        );

        if (nextOpen && pointerType === 'touch' && touchOpenDelay() > 0) {
          touchOpenTimeout.start(touchOpenDelay(), () => {
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
  });

  const returnValue = createMemo<ElementProps>(() => {
    if (!enabled()) {
      return {};
    }

    return { reference: reference() };
  });

  return returnValue;
}
