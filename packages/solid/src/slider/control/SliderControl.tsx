import { ownerDocument } from '@base-ui/utils/owner';
import { isElement } from '@floating-ui/utils/dom';
import { createEffect, onCleanup } from 'solid-js';
import { useDirection } from '../../direction-provider/DirectionContext';
import type { Coords } from '../../floating-ui-solid/types';
import { activeElement, contains } from '../../floating-ui-solid/utils';
import { splitComponentProps } from '../../solid-helpers';
import { clamp } from '../../utils/clamp';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps } from '../../utils/types';
import { useAnimationFrame } from '../../utils/useAnimationFrame';
import { useRenderElement } from '../../utils/useRenderElement';
import type { SliderRoot } from '../root/SliderRoot';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import { getMidpoint } from '../utils/getMidpoint';
import { resolveThumbCollision } from '../utils/resolveThumbCollision';
import { roundValueToStep } from '../utils/roundValueToStep';
import { validateMinimumDistance } from '../utils/validateMinimumDistance';

const INTENTIONAL_DRAG_COUNT_THRESHOLD = 2;

function getControlOffset(styles: CSSStyleDeclaration | null, vertical: boolean) {
  if (!styles) {
    return {
      start: 0,
      end: 0,
    };
  }

  function parseSize(value: string | null | undefined) {
    const parsed = value != null ? parseFloat(value) : 0;
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const start = !vertical ? 'InlineStart' : 'Top';
  const end = !vertical ? 'InlineEnd' : 'Bottom';

  return {
    start: parseSize(styles[`border${start}Width`]) + parseSize(styles[`padding${start}`]),
    end: parseSize(styles[`border${end}Width`]) + parseSize(styles[`padding${end}`]),
  };
}

function getFingerCoords(
  event: TouchEvent | PointerEvent,
  touchIdRef: number | null,
): Coords | null {
  // The event is TouchEvent
  if (touchIdRef != null && (event as TouchEvent).changedTouches) {
    const touchEvent = event as TouchEvent;
    for (let i = 0; i < touchEvent.changedTouches.length; i += 1) {
      const touch = touchEvent.changedTouches[i];
      if (touch.identifier === touchIdRef) {
        return {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    }

    return null;
  }

  // The event is PointerEvent
  return {
    x: (event as PointerEvent).clientX,
    y: (event as PointerEvent).clientY,
  };
}

/**
 * The clickable, interactive part of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderControl(componentProps: SliderControl.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const {
    disabled,
    dragging,
    validation,
    inset,
    refs,
    max,
    min,
    minStepsBetweenValues,
    onValueCommitted,
    orientation,
    registerFieldControlRef,
    renderBeforeHydration,
    setActive,
    setDragging,
    setValue,
    state,
    step,
    thumbCollisionBehavior,
    values,
  } = useSliderRootContext();

  const direction = useDirection();
  const range = () => values().length > 1;
  const vertical = () => orientation() === 'vertical';

  let controlRef = null as HTMLElement | null | undefined;
  let stylesRef = null as CSSStyleDeclaration | null;
  const setStylesRef = (element: HTMLElement | null | undefined) => {
    if (element && stylesRef == null) {
      if (stylesRef == null) {
        stylesRef = getComputedStyle(element);
      }
    }
  };
  // A number that uniquely identifies the current finger in the touch session.
  let touchIdRef = null as number | null;
  // The number of touch/pointermove events that have fired.
  let moveCountRef = 0;
  // The offset amount to each side of the control for inset sliders.
  // This value should be equal to the radius or half the width/height of the thumb.
  let insetThumbOffsetRef = 0;
  let latestValuesRef = values();
  createEffect(() => {
    latestValuesRef = values();
  });

  const updatePressedThumb = (nextIndex: number) => {
    if (refs.pressedThumbIndexRef !== nextIndex) {
      refs.pressedThumbIndexRef = nextIndex;
    }

    const thumbElement = refs.thumbRefs[nextIndex];

    if (!thumbElement) {
      refs.pressedThumbCenterOffsetRef = null;
      refs.pressedInputRef = null;
      return;
    }

    refs.pressedInputRef = thumbElement.querySelector<HTMLInputElement>('input[type="range"]');
  };

  const getFingerState = (fingerCoords: Coords): FingerState | null => {
    const control = controlRef;

    if (!control) {
      return null;
    }

    const { width, height, bottom, left, right } = control.getBoundingClientRect();

    const controlOffset = getControlOffset(stylesRef, vertical());
    const insetThumbOffset = insetThumbOffsetRef;
    const controlSize =
      (vertical() ? height : width) -
      controlOffset.start -
      controlOffset.end -
      insetThumbOffset * 2;
    const thumbCenterOffset = refs.pressedThumbCenterOffsetRef ?? 0;
    const fingerX = fingerCoords.x - thumbCenterOffset;
    const fingerY = fingerCoords.y - thumbCenterOffset;

    const valueSize = vertical()
      ? bottom - fingerY - controlOffset.end
      : (direction() === 'rtl' ? right - fingerX : fingerX - left) - controlOffset.start;
    // the value at the finger origin scaled down to fit the range [0, 1]
    const valueRescaled = clamp((valueSize - insetThumbOffset) / controlSize, 0, 1);

    let newValue = (max() - min()) * valueRescaled + min();
    newValue = roundValueToStep(newValue, step(), min());
    newValue = clamp(newValue, min(), max());

    if (!range()) {
      return {
        value: newValue,
        thumbIndex: 0,
        didSwap: false,
      };
    }

    const thumbIndex = refs.pressedThumbIndexRef;

    if (thumbIndex < 0) {
      return null;
    }

    const collisionResult = resolveThumbCollision({
      behavior: thumbCollisionBehavior(),
      values: values(),
      currentValues: latestValuesRef ?? values(),
      initialValues: refs.pressedValuesRef,
      pressedIndex: thumbIndex,
      nextValue: newValue,
      min: min(),
      max: max(),
      step: step(),
      minStepsBetweenValues: minStepsBetweenValues(),
    });

    if (thumbCollisionBehavior() === 'swap' && collisionResult.didSwap) {
      updatePressedThumb(collisionResult.thumbIndex);
    } else {
      refs.pressedThumbIndexRef = collisionResult.thumbIndex;
    }

    return collisionResult;
  };

  const startPressing = (fingerCoords: Coords) => {
    refs.pressedValuesRef = range() ? values().slice() : null;
    latestValuesRef = values();

    const pressedThumbIndex = refs.pressedThumbIndexRef;
    let closestThumbIndex = pressedThumbIndex;

    if (pressedThumbIndex > -1 && pressedThumbIndex < values().length) {
      if (values()[pressedThumbIndex] === max()) {
        let candidateIndex = pressedThumbIndex;

        while (candidateIndex > 0 && values()[candidateIndex - 1] === max()) {
          candidateIndex -= 1;
        }

        closestThumbIndex = candidateIndex;
      }
    } else {
      // pressed on control
      const axis = !vertical() ? 'x' : 'y';
      let minDistance: number | undefined;

      closestThumbIndex = -1;

      for (let i = 0; i < refs.thumbRefs.length; i += 1) {
        const thumbEl = refs.thumbRefs[i];
        if (isElement(thumbEl)) {
          const midpoint = getMidpoint(thumbEl);
          const distance = Math.abs(fingerCoords[axis] - midpoint[axis]);

          if (minDistance === undefined || distance <= minDistance) {
            closestThumbIndex = i;
            minDistance = distance;
          }
        }
      }
    }

    if (closestThumbIndex > -1 && closestThumbIndex !== pressedThumbIndex) {
      updatePressedThumb(closestThumbIndex);
    }

    if (inset()) {
      const thumbEl = refs.thumbRefs[closestThumbIndex];
      if (isElement(thumbEl)) {
        const thumbRect = thumbEl.getBoundingClientRect();
        const side = !vertical() ? 'width' : 'height';
        insetThumbOffsetRef = thumbRect[side] / 2;
      }
    }
  };

  const focusThumb = (thumbIndex: number) => {
    refs.thumbRefs[thumbIndex]
      ?.querySelector<HTMLInputElement>('input[type="range"]')
      ?.focus({ preventScroll: true });
  };

  const handleTouchMove = (nativeEvent: TouchEvent | PointerEvent) => {
    const fingerCoords = getFingerCoords(nativeEvent, touchIdRef);

    if (fingerCoords == null) {
      return;
    }

    moveCountRef += 1;

    // Cancel move in case some other element consumed a pointerup event and it was not fired.
    if (nativeEvent.type === 'pointermove' && (nativeEvent as PointerEvent).buttons === 0) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      handleTouchEnd(nativeEvent);
      return;
    }

    const finger = getFingerState(fingerCoords);

    if (finger == null) {
      return;
    }

    if (validateMinimumDistance(finger.value, step(), minStepsBetweenValues())) {
      if (!dragging() && moveCountRef > INTENTIONAL_DRAG_COUNT_THRESHOLD) {
        setDragging(true);
      }

      setValue(
        finger.value,
        createChangeEventDetails(REASONS.drag, nativeEvent, undefined, {
          activeThumbIndex: finger.thumbIndex,
        }),
      );

      latestValuesRef = Array.isArray(finger.value) ? finger.value : [finger.value];

      if (finger.didSwap) {
        focusThumb(finger.thumbIndex);
      }
    }
  };

  const handleTouchEnd = (nativeEvent: TouchEvent | PointerEvent) => {
    setActive(-1);
    setDragging(false);

    refs.pressedInputRef = null;
    refs.pressedThumbCenterOffsetRef = null;

    const fingerCoords = getFingerCoords(nativeEvent, touchIdRef);
    const finger = fingerCoords != null ? getFingerState(fingerCoords) : null;

    if (finger != null) {
      const commitReason = refs.lastChangeReasonRef;
      validation.commit(refs.lastChangedValueRef ?? finger.value);
      onValueCommitted(
        refs.lastChangedValueRef ?? finger.value,
        createGenericEventDetails(commitReason, nativeEvent),
      );
    }

    if ('pointerType' in nativeEvent && controlRef?.hasPointerCapture(nativeEvent.pointerId)) {
      controlRef?.releasePointerCapture(nativeEvent.pointerId);
    }

    refs.pressedThumbIndexRef = -1;
    touchIdRef = null;
    refs.pressedValuesRef = null;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    stopListening();
  };

  const handleTouchStart = (nativeEvent: TouchEvent) => {
    if (disabled()) {
      return;
    }

    const touch = nativeEvent.changedTouches[0];

    if (touch != null) {
      touchIdRef = touch.identifier;
    }

    const fingerCoords = getFingerCoords(nativeEvent, touchIdRef);

    if (fingerCoords != null) {
      startPressing(fingerCoords);

      const finger = getFingerState(fingerCoords);

      if (finger == null) {
        return;
      }

      focusThumb(finger.thumbIndex);
      setValue(
        finger.value,
        createChangeEventDetails(REASONS.trackPress, nativeEvent, undefined, {
          activeThumbIndex: finger.thumbIndex,
        }),
      );

      latestValuesRef = Array.isArray(finger.value) ? finger.value : [finger.value];

      if (finger.didSwap) {
        focusThumb(finger.thumbIndex);
      }
    }

    moveCountRef = 0;
    const doc = ownerDocument(controlRef ?? null);
    doc.addEventListener('touchmove', handleTouchMove, { passive: true });
    doc.addEventListener('touchend', handleTouchEnd, { passive: true });
  };

  const stopListening = () => {
    const doc = ownerDocument(controlRef ?? null);
    doc.removeEventListener('pointermove', handleTouchMove);
    doc.removeEventListener('pointerup', handleTouchEnd);
    doc.removeEventListener('touchmove', handleTouchMove);
    doc.removeEventListener('touchend', handleTouchEnd);
    refs.pressedValuesRef = null;
  };

  const focusFrame = useAnimationFrame();

  createEffect(() => {
    if (!controlRef) {
      onCleanup(() => stopListening());
      return;
    }

    controlRef.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });

    onCleanup(() => {
      controlRef?.removeEventListener('touchstart', handleTouchStart);
      focusFrame.cancel();

      stopListening();
    });
  });

  createEffect(() => {
    if (disabled()) {
      stopListening();
    }
  });

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      registerFieldControlRef(el);
      controlRef = el;
      setStylesRef(el);
    },
    props: [
      {
        ['data-base-ui-slider-control' as string]: renderBeforeHydration() ? '' : undefined,
        onPointerDown(event) {
          const control = controlRef;

          if (
            !control ||
            disabled() ||
            event.defaultPrevented ||
            !isElement(event.target) ||
            // Only handle left clicks
            event.button !== 0
          ) {
            return;
          }

          const fingerCoords = getFingerCoords(event, touchIdRef);

          if (fingerCoords != null) {
            startPressing(fingerCoords);

            const finger = getFingerState(fingerCoords);

            if (finger == null) {
              return;
            }

            const pressedOnFocusedThumb = contains(
              refs.thumbRefs[finger.thumbIndex],
              activeElement(ownerDocument(control)),
            );

            if (pressedOnFocusedThumb) {
              event.preventDefault();
            } else {
              focusFrame.request(() => {
                focusThumb(finger.thumbIndex);
              });
            }

            setDragging(true);

            const pressedOnAnyThumb = refs.pressedThumbCenterOffsetRef != null;
            if (!pressedOnAnyThumb) {
              setValue(
                finger.value,
                createChangeEventDetails(REASONS.trackPress, event, undefined, {
                  activeThumbIndex: finger.thumbIndex,
                }),
              );

              latestValuesRef = Array.isArray(finger.value) ? finger.value : [finger.value];

              if (finger.didSwap) {
                focusThumb(finger.thumbIndex);
              }
            }
          }

          if (event.pointerId) {
            control.setPointerCapture(event.pointerId);
          }

          moveCountRef = 0;
          const doc = ownerDocument(controlRef ?? null);
          doc.addEventListener('pointermove', handleTouchMove, { passive: true });
          doc.addEventListener('pointerup', handleTouchEnd, { once: true });
        },
        tabIndex: -1,
      },
      elementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });

  return <>{element()}</>;
}

interface FingerState {
  value: number | number[];
  thumbIndex: number;
  didSwap: boolean;
}

export interface SliderControlProps extends BaseUIComponentProps<'div', SliderRoot.State> {}

export namespace SliderControl {
  export type State = SliderRoot.State;
  export type Props = SliderControlProps;
}
