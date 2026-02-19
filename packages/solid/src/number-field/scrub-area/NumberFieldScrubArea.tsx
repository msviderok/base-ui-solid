import { isFirefox, isWebKit } from '@base-ui/utils/detectBrowser';
import { ownerDocument, ownerWindow } from '@base-ui/utils/owner';
import { createEffect, createSignal, onCleanup } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { createGenericEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import type { NumberFieldRoot } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { DEFAULT_STEP } from '../utils/constants';
import { getViewportRect } from '../utils/getViewportRect';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { subscribeToVisualViewportResize } from '../utils/subscribeToVisualViewportResize';
import { NumberFieldScrubAreaContext } from './NumberFieldScrubAreaContext';

/**
 * An interactive area where the user can click and drag to change the field value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldScrubArea(componentProps: NumberFieldScrubArea.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'direction',
    'pixelSensitivity',
    'teleportDistance',
  ]);
  const direction = () => local.direction ?? 'horizontal';
  const pixelSensitivity = () => local.pixelSensitivity ?? 2;

  const {
    state,
    setIsScrubbing: setRootScrubbing,
    disabled,
    readOnly,
    incrementValue,
    getStepAmount,
    refs: numberFieldRootRefs,
    onValueCommitted,
  } = useNumberFieldRootContext();

  const refs: NumberFieldScrubAreaContext['refs'] = {
    scrubAreaCursorRef: null,
    scrubAreaRef: null,
  };

  let isScrubbingRef = false;
  let didMoveRef = false;
  let pointerDownTargetRef = null as EventTarget | null | undefined;
  let virtualCursorCoords = { x: 0, y: 0 };
  // TODO: this is needed to be a react-like ref due to it being mutated in the subscribeToVisualViewportResize
  const visualScaleRef = { current: 1 };

  const exitPointerLockTimeout = useTimeout();

  const [isTouchInput, setIsTouchInput] = createSignal(false);
  const [isPointerLockDenied, setIsPointerLockDenied] = createSignal(false);
  const [isScrubbing, setIsScrubbing] = createSignal(false);

  createEffect(() => {
    if (!isScrubbing() || !refs.scrubAreaCursorRef) {
      return;
    }

    subscribeToVisualViewportResize(refs.scrubAreaCursorRef, visualScaleRef);
  });

  function updateCursorTransform(x: number, y: number) {
    if (refs.scrubAreaCursorRef) {
      refs.scrubAreaCursorRef.style.transform = `translate3d(${x}px,${y}px,0) scale(${1 / visualScaleRef.current})`;
    }
  }

  const onScrub = ({ movementX, movementY }: PointerEvent) => {
    const virtualCursor = refs.scrubAreaCursorRef;
    const scrubAreaEl = refs.scrubAreaRef;

    if (!virtualCursor || !scrubAreaEl) {
      return;
    }

    const rect = getViewportRect(local.teleportDistance, scrubAreaEl);

    const coords = virtualCursorCoords;
    const newCoords = {
      x: Math.round(coords.x + movementX),
      y: Math.round(coords.y + movementY),
    };

    const cursorWidth = virtualCursor.offsetWidth;
    const cursorHeight = virtualCursor.offsetHeight;

    if (newCoords.x + cursorWidth / 2 < rect.x) {
      newCoords.x = rect.width - cursorWidth / 2;
    } else if (newCoords.x + cursorWidth / 2 > rect.width) {
      newCoords.x = rect.x - cursorWidth / 2;
    }

    if (newCoords.y + cursorHeight / 2 < rect.y) {
      newCoords.y = rect.height - cursorHeight / 2;
    } else if (newCoords.y + cursorHeight / 2 > rect.height) {
      newCoords.y = rect.y - cursorHeight / 2;
    }

    virtualCursorCoords = newCoords;

    updateCursorTransform(newCoords.x, newCoords.y);
  };

  const onScrubbingChange = (scrubbingValue: boolean, { clientX, clientY }: PointerEvent) => {
    setIsScrubbing(scrubbingValue);
    setRootScrubbing(scrubbingValue);

    const virtualCursor = refs.scrubAreaCursorRef;
    if (!virtualCursor || !scrubbingValue) {
      return;
    }

    const initialCoords = {
      x: clientX - virtualCursor.offsetWidth / 2,
      y: clientY - virtualCursor.offsetHeight / 2,
    };

    virtualCursorCoords = initialCoords;

    updateCursorTransform(initialCoords.x, initialCoords.y);
  };

  createEffect(function registerGlobalScrubbingEventListeners() {
    // Only listen while actively scrubbing; avoids unrelated pointerup events committing.
    if (!numberFieldRootRefs.inputRef || disabled() || readOnly() || !isScrubbing()) {
      return;
    }

    let cumulativeDelta = 0;

    function handleScrubPointerUp(event: PointerEvent) {
      function handler() {
        try {
          ownerDocument(refs.scrubAreaRef ?? null).exitPointerLock();
        } catch {
          // Ignore errors.
        } finally {
          isScrubbingRef = false;
          onScrubbingChange(false, event);
          onValueCommitted(
            numberFieldRootRefs.lastChangedValueRef ?? numberFieldRootRefs.valueRef,
            createGenericEventDetails(REASONS.scrub, event),
          );

          // Manually dispatch a click event if no movement happened, since
          // preventDefault on pointerdown prevents the browser click event.
          if (!didMoveRef && pointerDownTargetRef != null) {
            pointerDownTargetRef.dispatchEvent(
              new MouseEvent('click', { bubbles: true, cancelable: true }),
            );
          }

          didMoveRef = false;
          pointerDownTargetRef = null;
        }
      }

      if (isFirefox) {
        // Firefox needs a small delay here when soft-clicking as the pointer
        // lock will not release otherwise.
        exitPointerLockTimeout.start(20, handler);
      } else {
        handler();
      }
    }

    function handleScrubPointerMove(event: PointerEvent) {
      if (!isScrubbingRef) {
        return;
      }

      // Prevent text selection.
      event.preventDefault();

      onScrub(event);

      const { movementX, movementY } = event;

      cumulativeDelta += direction() === 'vertical' ? movementY : movementX;

      if (Math.abs(cumulativeDelta) >= pixelSensitivity()) {
        cumulativeDelta = 0;
        didMoveRef = true;
        const dValue = direction() === 'vertical' ? -movementY : movementX;
        const stepAmount = getStepAmount(event) ?? DEFAULT_STEP;
        const rawAmount = dValue * stepAmount;

        if (rawAmount !== 0) {
          incrementValue(Math.abs(rawAmount), {
            direction: rawAmount >= 0 ? 1 : -1,
            event,
            reason: REASONS.scrub,
          });
        }
      }
    }

    const win = ownerWindow(numberFieldRootRefs.inputRef);
    win.addEventListener('pointerup', handleScrubPointerUp, true);
    win.addEventListener('pointermove', handleScrubPointerMove, true);

    onCleanup(() => {
      exitPointerLockTimeout.clear();
      win.removeEventListener('pointerup', handleScrubPointerUp, true);
      win.removeEventListener('pointermove', handleScrubPointerMove, true);
    });
  });

  // Prevent scrolling using touch input when scrubbing.
  createEffect(function registerScrubberTouchPreventListener() {
    const element = refs.scrubAreaRef;
    if (!element || disabled() || readOnly()) {
      return;
    }

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length === 1) {
        event.preventDefault();
      }
    }

    element.addEventListener('touchstart', handleTouchStart);

    onCleanup(() => {
      element.removeEventListener('touchstart', handleTouchStart);
    });
  });

  const defaultProps: HTMLProps = {
    role: 'presentation',
    style: {
      'touch-action': 'none',
      '-webkit-user-select': 'none',
      'user-select': 'none',
    },
    async onPointerDown(event) {
      const isMainButton = !event.button || event.button === 0;
      if (event.defaultPrevented || readOnly() || !isMainButton || disabled()) {
        return;
      }

      const isTouch = event.pointerType === 'touch';
      setIsTouchInput(isTouch);

      if (event.pointerType === 'mouse') {
        event.preventDefault();
        numberFieldRootRefs.inputRef?.focus();
      }

      isScrubbingRef = true;
      didMoveRef = false;
      pointerDownTargetRef = event.target;
      onScrubbingChange(true, event);

      // WebKit causes significant layout shift with the native message, so we can't use it.
      if (!isTouch && !isWebKit) {
        try {
          // Avoid non-deterministic errors in testing environments. This error sometimes
          // appears:
          // "The root document of this element is not valid for pointer lock."
          await ownerDocument(refs.scrubAreaRef ?? null).body.requestPointerLock();
          setIsPointerLockDenied(false);
        } catch (error) {
          setIsPointerLockDenied(true);
        } finally {
          if (isScrubbingRef) {
            onScrubbingChange(true, event);
          }
        }
      }
    },
  };

  const element = useRenderElement('span', componentProps, {
    state,
    ref: (el) => {
      refs.scrubAreaRef = el;
    },
    props: [defaultProps, elementProps],
    stateAttributesMapping,
  });

  const contextValue: NumberFieldScrubAreaContext = {
    isScrubbing,
    isTouchInput,
    isPointerLockDenied,
    refs,
    direction,
    pixelSensitivity,
    teleportDistance: () => local.teleportDistance,
  };

  return (
    <NumberFieldScrubAreaContext.Provider value={contextValue}>
      {element()}
    </NumberFieldScrubAreaContext.Provider>
  );
}

export interface NumberFieldScrubAreaState extends NumberFieldRoot.State {}

export interface NumberFieldScrubAreaProps extends BaseUIComponentProps<
  'span',
  NumberFieldScrubArea.State
> {
  /**
   * Cursor movement direction in the scrub area.
   * @default 'horizontal'
   */
  direction?: ('horizontal' | 'vertical') | undefined;
  /**
   * Determines how many pixels the cursor must move before the value changes.
   * A higher value will make scrubbing less sensitive.
   * @default 2
   */
  pixelSensitivity?: number | undefined;
  /**
   * If specified, determines the distance that the cursor may move from the center
   * of the scrub area before it will loop back around.
   */
  teleportDistance?: number | undefined;
}

export namespace NumberFieldScrubArea {
  export type State = NumberFieldScrubAreaState;
  export type Props = NumberFieldScrubAreaProps;
}
