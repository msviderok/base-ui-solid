import { batch, createEffect, createMemo, createSignal, type JSX } from 'solid-js';
import { contains, getTarget } from '../floating-ui-solid/utils';
import { clamp } from './clamp';
import { ownerDocument } from './owner';
import { findScrollableTouchTarget, hasScrollableAncestor, type ScrollAxis } from './scrollable';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

type SwipeDismissNativeEvent = PointerEvent | TouchEvent;
type SwipeDismissStartEvent = PointerEvent | TouchEvent;
type SwipeDismissMoveEvent = PointerEvent | TouchEvent;
type SwipeDismissEndEvent = PointerEvent | TouchEvent;
type SwipeProgressDetailsInternal = {
  deltaX: number;
  deltaY: number;
  direction: SwipeDirection | undefined;
};

const DEFAULT_SWIPE_THRESHOLD = 40;
const REVERSE_CANCEL_THRESHOLD = 10;
const MIN_DRAG_THRESHOLD = 1;
const MIN_VELOCITY_DURATION_MS = 50;
const MIN_RELEASE_VELOCITY_DURATION_MS = 16;
const MAX_RELEASE_VELOCITY_AGE_MS = 80;
const DEFAULT_IGNORE_SELECTOR = 'button,a,input,select,textarea,label,[role="button"]';

export function getDisplacement(direction: SwipeDirection, deltaX: number, deltaY: number) {
  switch (direction) {
    case 'up':
      return -deltaY;
    case 'down':
      return deltaY;
    case 'left':
      return -deltaX;
    case 'right':
      return deltaX;
    default:
      return 0;
  }
}

export function getElementTransform(element: HTMLElement) {
  const computedStyle = window.getComputedStyle(element);
  const transform = computedStyle.transform;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;

  if (transform && transform !== 'none') {
    const matrix = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (matrix) {
      const values = matrix[1].split(', ').map(parseFloat);
      if (values.length === 6) {
        translateX = values[4];
        translateY = values[5];
        scale = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
      } else if (values.length === 16) {
        translateX = values[12];
        translateY = values[13];
        scale = values[0];
      }
    }
  }

  return { x: translateX, y: translateY, scale };
}

function getValidTimeStamp(timeStamp: number): number | null {
  return Number.isFinite(timeStamp) && timeStamp > 0 ? timeStamp : null;
}

function hasPrimaryMouseButton(buttons: number): boolean {
  return buttons % 2 === 1;
}

function safelyChangePointerCapture(
  element: HTMLElement,
  pointerId: number,
  method: 'setPointerCapture' | 'releasePointerCapture',
) {
  const pointerCaptureMethod = element[method];
  if (typeof pointerCaptureMethod !== 'function') {
    return;
  }

  try {
    pointerCaptureMethod.call(element, pointerId);
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFoundError') {
      return;
    }
    throw error;
  }
}

export function useSwipeDismiss(options: useSwipeDismiss.Options): useSwipeDismiss.ReturnValue {
  const ignoreSelectorWhenTouch = () => options.ignoreSelectorWhenTouch ?? true;
  const ignoreScrollableAncestors = () => options.ignoreScrollableAncestors ?? false;
  const swipeThresholdProp = () => options.swipeThreshold;
  const trackDrag = () => options.trackDrag ?? true;

  const ignoreSelector = DEFAULT_IGNORE_SELECTOR;
  const primaryDirection = () =>
    options.directions.length === 1 ? options.directions[0] : undefined;

  const swipeThresholdDefault = () => {
    const threshold = swipeThresholdProp();
    return Math.max(0, typeof threshold === 'number' ? threshold : DEFAULT_SWIPE_THRESHOLD);
  };

  const allowLeft = () => options.directions.includes('left');
  const allowRight = () => options.directions.includes('right');
  const allowUp = () => options.directions.includes('up');
  const allowDown = () => options.directions.includes('down');
  const hasHorizontal = () => allowLeft() || allowRight();
  const hasVertical = () => allowUp() || allowDown();

  const scrollAxes = createMemo<ScrollAxis[]>(() => {
    const axes: ScrollAxis[] = [];
    if (hasVertical()) {
      axes.push('vertical');
    }
    if (hasHorizontal()) {
      axes.push('horizontal');
    }
    return axes;
  });

  const [currentSwipeDirection, setCurrentSwipeDirection] = createSignal<
    SwipeDirection | undefined
  >(undefined);
  const [isSwiping, setIsSwiping] = createSignal(false);
  const [isRealSwipe, setIsRealSwipe] = createSignal(false);
  const [dragDismissed, setDragDismissed] = createSignal(false);
  const [dragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = createSignal({ x: 0, y: 0, scale: 1 });
  const [lockedDirection, setLockedDirection] = createSignal<'horizontal' | 'vertical' | null>(
    null,
  );

  let dragStartPosRef = { x: 0, y: 0 };
  let dragOffsetRef = { x: 0, y: 0 };
  let lastMovePosRef = null as { x: number; y: number } | null;
  let initialTransformRef = { x: 0, y: 0, scale: 1 };
  let intendedSwipeDirectionRef = undefined as SwipeDirection | undefined;
  let maxSwipeDisplacementRef = 0;
  let cancelledSwipeRef = false;
  let swipeCancelBaselineRef = { x: 0, y: 0 };
  let isFirstPointerMoveRef = false;
  let pendingSwipeRef = false;
  let pendingSwipeStartPosRef = null as { x: number; y: number } | null;
  let swipeFromScrollableRef = false;
  let sawPrimaryButtonsOnMoveRef = false;
  let elementSizeRef = { width: 0, height: 0 };
  let swipeProgressRef = 0;
  let swipeThresholdRef = swipeThresholdDefault();
  let swipeStartTimeRef = null as number | null;
  let lastDragSampleRef = null as { x: number; y: number; time: number } | null;
  let lastDragVelocityRef = { x: 0, y: 0 };
  let lastProgressDetailsRef = null as SwipeProgressDetailsInternal | null;
  let isSwipingRef = false;

  const setSwiping = (nextSwiping: boolean) => {
    if (isSwipingRef === nextSwiping) {
      return;
    }

    isSwipingRef = nextSwiping;
    setIsSwiping(nextSwiping);
    options.onSwipingChange?.(nextSwiping);
  };

  function resolveSwipeThreshold(direction: SwipeDirection | undefined) {
    if (!direction) {
      return;
    }

    const threshold = swipeThresholdProp();
    if (typeof threshold !== 'function') {
      swipeThresholdRef = swipeThresholdDefault();
      return;
    }

    const element = options.elementRef;
    if (!element) {
      return;
    }

    const value = threshold({ element, direction });
    swipeThresholdRef = Math.max(0, value);
  }

  const updateSwipeProgress = (progress: number, details?: SwipeProgressDetailsInternal) => {
    const nextProgress = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
    const progressChanged = nextProgress !== swipeProgressRef;
    let detailsChanged = false;

    if (details) {
      const lastDetails = lastProgressDetailsRef;
      detailsChanged =
        !lastDetails ||
        lastDetails.deltaX !== details.deltaX ||
        lastDetails.deltaY !== details.deltaY ||
        lastDetails.direction !== details.direction;
    }

    if (!progressChanged && !detailsChanged) {
      return;
    }

    swipeProgressRef = nextProgress;
    if (details) {
      lastProgressDetailsRef = details;
    } else if (progressChanged) {
      lastProgressDetailsRef = null;
    }
    options.onProgress?.(nextProgress, details);
  };

  function recordDragSample(offset: { x: number; y: number }, timeStamp: number | null) {
    if (timeStamp === null) {
      return;
    }

    const lastSample = lastDragSampleRef;
    if (lastSample && timeStamp > lastSample.time) {
      const durationMs = Math.max(timeStamp - lastSample.time, MIN_RELEASE_VELOCITY_DURATION_MS);
      lastDragVelocityRef = {
        x: (offset.x - lastSample.x) / durationMs,
        y: (offset.y - lastSample.y) / durationMs,
      };
    }

    lastDragSampleRef = { x: offset.x, y: offset.y, time: timeStamp };
  }

  const reset = () => {
    batch(() => {
      setCurrentSwipeDirection(undefined);
      setSwiping(false);
      setIsRealSwipe(false);
      setDragDismissed(false);
      setDragOffset({ x: 0, y: 0 });
      setInitialTransform({ x: 0, y: 0, scale: 1 });
      setLockedDirection(null);
      updateSwipeProgress(0);

      swipeThresholdRef = swipeThresholdDefault();
      dragStartPosRef = { x: 0, y: 0 };
      dragOffsetRef = { x: 0, y: 0 };
      initialTransformRef = { x: 0, y: 0, scale: 1 };
      intendedSwipeDirectionRef = undefined;
      maxSwipeDisplacementRef = 0;
      cancelledSwipeRef = false;
      swipeCancelBaselineRef = { x: 0, y: 0 };
      isFirstPointerMoveRef = false;
      lastMovePosRef = null;
      pendingSwipeRef = false;
      pendingSwipeStartPosRef = null;
      swipeFromScrollableRef = false;
      sawPrimaryButtonsOnMoveRef = false;
      elementSizeRef = { width: 0, height: 0 };
      swipeStartTimeRef = null;
      lastDragSampleRef = null;
      lastDragVelocityRef = { x: 0, y: 0 };
      lastProgressDetailsRef = null;
    });
  };

  createEffect(() => {
    if (typeof swipeThresholdProp() !== 'function') {
      swipeThresholdRef = swipeThresholdDefault();
    }
  });

  function getPrimaryPointerPosition(
    event: SwipeDismissStartEvent | SwipeDismissMoveEvent | SwipeDismissEndEvent,
  ) {
    if ('touches' in event) {
      const touch = event.touches[0];
      return touch ? { x: touch.clientX, y: touch.clientY } : null;
    }

    return { x: event.clientX, y: event.clientY };
  }

  function isTouchLikeEvent(
    event: SwipeDismissStartEvent | SwipeDismissMoveEvent | SwipeDismissEndEvent,
  ) {
    if ('touches' in event) {
      return true;
    }
    return event.pointerType === 'touch';
  }

  function getTargetAtPoint(position: { x: number; y: number }, nativeEvent: Event) {
    const doc = ownerDocument(options.elementRef ?? null);
    const elementAtPoint =
      typeof doc?.elementFromPoint === 'function'
        ? doc.elementFromPoint(position.x, position.y)
        : null;
    const target = elementAtPoint ?? getTarget(nativeEvent);
    return target as HTMLElement | null | undefined;
  }

  function findGestureScrollableTouchTarget(
    target: EventTarget | null | undefined,
    root: HTMLElement,
  ): HTMLElement | null | undefined {
    if (hasHorizontal() && !hasVertical()) {
      return findScrollableTouchTarget(target, root, 'horizontal');
    }

    if (hasVertical() && !hasHorizontal()) {
      return findScrollableTouchTarget(target, root, 'vertical');
    }

    return (
      findScrollableTouchTarget(target, root, 'vertical') ??
      findScrollableTouchTarget(target, root, 'horizontal')
    );
  }

  function startSwipeAtPosition(
    event: SwipeDismissStartEvent | SwipeDismissMoveEvent,
    position: { x: number; y: number },
    startOptions?: {
      ignoreScrollableTarget?: boolean | undefined;
      ignoreScrollableAncestors?: boolean | undefined;
    },
  ) {
    swipeFromScrollableRef = false;
    const touchLike = isTouchLikeEvent(event);
    const target = getTargetAtPoint(position, event);

    const doc = ownerDocument(options.elementRef ?? null);
    const body = doc.body;

    const scrollableTarget =
      touchLike && body ? findGestureScrollableTouchTarget(target, body) : null;
    const ignoreScrollableTarget = startOptions?.ignoreScrollableTarget ?? false;
    if (scrollableTarget && !ignoreScrollableTarget) {
      return false;
    }
    swipeFromScrollableRef = Boolean(scrollableTarget && ignoreScrollableTarget);

    const isInteractiveElement = target ? target.closest(ignoreSelector) : false;
    if (isInteractiveElement && (!touchLike || ignoreSelectorWhenTouch())) {
      return false;
    }

    const element = options.elementRef ?? null;
    if (ignoreScrollableAncestors() && element && target && scrollAxes().length > 0) {
      const ignoreAncestors = startOptions?.ignoreScrollableAncestors ?? false;
      if (!ignoreAncestors && hasScrollableAncestor(target, element, scrollAxes())) {
        return false;
      }
    }
    batch(() => {
      cancelledSwipeRef = false;
      intendedSwipeDirectionRef = undefined;
      maxSwipeDisplacementRef = 0;

      dragStartPosRef = position;
      swipeStartTimeRef = getValidTimeStamp(event.timeStamp);
      swipeCancelBaselineRef = position;
      lastMovePosRef = position;

      if (element) {
        elementSizeRef = { width: element.offsetWidth, height: element.offsetHeight };
        resolveSwipeThreshold(primaryDirection());
        const transform = getElementTransform(element);
        initialTransformRef = transform;
        dragOffsetRef = { x: transform.x, y: transform.y };
        setInitialTransform(transform);
        setDragOffset({ x: transform.x, y: transform.y });
        recordDragSample({ x: transform.x, y: transform.y }, swipeStartTimeRef);

        if (!('touches' in event)) {
          safelyChangePointerCapture(element, event.pointerId, 'setPointerCapture');
        }
      }

      options.onSwipeStart?.(event as SwipeDismissNativeEvent);

      setSwiping(true);
      setIsRealSwipe(false);
      setLockedDirection(null);
      isFirstPointerMoveRef = true;
      updateSwipeProgress(0);
    });
    return true;
  }

  function resetPendingSwipeState() {
    clearPendingSwipeStartState();
    swipeFromScrollableRef = false;
    lastMovePosRef = null;
  }

  function clearPendingSwipeStartState() {
    pendingSwipeRef = false;
    pendingSwipeStartPosRef = null;
  }

  function cancelSwipeInteraction(event: PointerEvent) {
    batch(() => {
      resetPendingSwipeState();

      if (!isSwipingRef) {
        return;
      }

      setSwiping(false);
      setIsRealSwipe(false);
      setLockedDirection(null);

      const resolvedInitialTransform = trackDrag() ? initialTransform() : initialTransformRef;
      dragOffsetRef = { x: resolvedInitialTransform.x, y: resolvedInitialTransform.y };
      setDragOffset({ x: resolvedInitialTransform.x, y: resolvedInitialTransform.y });
      setCurrentSwipeDirection(undefined);
      sawPrimaryButtonsOnMoveRef = false;

      const element = options.elementRef ?? null;
      if (element) {
        safelyChangePointerCapture(element, event.pointerId, 'releasePointerCapture');
      }

      updateSwipeProgress(0, {
        deltaX: 0,
        deltaY: 0,
        direction: undefined,
      });
    });
  }

  function applyDirectionalDamping(deltaX: number, deltaY: number) {
    const exponent = (value: number) => (value >= 0 ? value ** 0.5 : -(Math.abs(value) ** 0.5));
    const dampAxis = (delta: number, allowNegative: boolean, allowPositive: boolean) => {
      if (!allowNegative && delta < 0) {
        return exponent(delta);
      }
      if (!allowPositive && delta > 0) {
        return exponent(delta);
      }
      return delta;
    };

    const newDeltaX = hasHorizontal()
      ? dampAxis(deltaX, allowLeft(), allowRight())
      : exponent(deltaX);
    const newDeltaY = hasVertical() ? dampAxis(deltaY, allowUp(), allowDown()) : exponent(deltaY);

    return { x: newDeltaX, y: newDeltaY };
  }

  function canSwipeFromScrollEdgeOnPendingMove(
    scrollTarget: HTMLElement,
    deltaX: number,
    deltaY: number,
  ): boolean | null {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const useVerticalAxis =
      hasVertical() && deltaY !== 0 && (!hasHorizontal() || absDeltaY >= absDeltaX);

    if (useVerticalAxis) {
      const maxScrollTop = Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight);
      const atTop = scrollTarget.scrollTop <= 0;
      const atBottom = scrollTarget.scrollTop >= maxScrollTop;
      const movingDown = deltaY > 0;
      const movingUp = deltaY < 0;
      const canSwipeDown = movingDown && atTop && allowDown();
      const canSwipeUp = movingUp && atBottom && allowUp();
      return canSwipeDown || canSwipeUp;
    }

    const useHorizontalAxis =
      hasHorizontal() && deltaX !== 0 && (!hasVertical() || absDeltaX > absDeltaY);
    if (useHorizontalAxis) {
      const maxScrollLeft = Math.max(0, scrollTarget.scrollWidth - scrollTarget.clientWidth);
      const atLeft = scrollTarget.scrollLeft <= 0;
      const atRight = scrollTarget.scrollLeft >= maxScrollLeft;
      const movingRight = deltaX > 0;
      const movingLeft = deltaX < 0;
      const canSwipeRight = movingRight && atLeft && allowRight();
      const canSwipeLeft = movingLeft && atRight && allowLeft();
      return canSwipeRight || canSwipeLeft;
    }

    return null;
  }

  const handleStart = (event: SwipeDismissStartEvent) => {
    if (!options.enabled) {
      return;
    }

    if (event.defaultPrevented || event.defaultPrevented) {
      return;
    }

    if (!('touches' in event) && event.button !== 0) {
      return;
    }

    const startPos = getPrimaryPointerPosition(event);
    if (!startPos) {
      return;
    }

    pendingSwipeRef = true;
    pendingSwipeStartPosRef = startPos;
    swipeFromScrollableRef = false;
    sawPrimaryButtonsOnMoveRef = false;

    const allowedToStart = options.canStart
      ? options.canStart(startPos, {
          nativeEvent: event as SwipeDismissNativeEvent,
          direction: primaryDirection(),
        })
      : true;
    if (!allowedToStart) {
      return;
    }

    if (startSwipeAtPosition(event, startPos)) {
      clearPendingSwipeStartState();
    }
  };

  function handleMoveCore(
    event: SwipeDismissMoveEvent,
    position: { x: number; y: number },
    movement: { x: number; y: number },
  ) {
    if (!options.enabled || !isSwipingRef) {
      return;
    }

    const target = getTarget(event) as HTMLElement | null | undefined;
    if (isTouchLikeEvent(event) && !swipeFromScrollableRef) {
      const boundaryElement = event.currentTarget as HTMLElement;
      if (findGestureScrollableTouchTarget(target, boundaryElement)) {
        return;
      }
    }

    if (!('touches' in event)) {
      // Prevent text selection on Safari
      event.preventDefault();
    }

    if (isFirstPointerMoveRef) {
      // Adjust the starting position to the current position on the first move
      // to account for the delay between pointerdown and the first pointermove on iOS.
      dragStartPosRef = position;
      const moveTime = getValidTimeStamp(event.timeStamp);
      if (moveTime !== null) {
        swipeStartTimeRef = moveTime;
      }
      isFirstPointerMoveRef = false;
    }

    const clientX = position.x;
    const clientY = position.y;
    const movementX = movement.x;
    const movementY = movement.y;

    if (
      (movementY < 0 && clientY > swipeCancelBaselineRef.y) ||
      (movementY > 0 && clientY < swipeCancelBaselineRef.y)
    ) {
      swipeCancelBaselineRef = { x: swipeCancelBaselineRef.x, y: clientY };
    }

    if (
      (movementX < 0 && clientX > swipeCancelBaselineRef.x) ||
      (movementX > 0 && clientX < swipeCancelBaselineRef.x)
    ) {
      swipeCancelBaselineRef = { x: clientX, y: swipeCancelBaselineRef.y };
    }

    const deltaX = clientX - dragStartPosRef.x;
    const deltaY = clientY - dragStartPosRef.y;
    const cancelDeltaY = clientY - swipeCancelBaselineRef.y;
    const cancelDeltaX = clientX - swipeCancelBaselineRef.x;

    if (!isRealSwipe()) {
      const movementDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (movementDistance >= MIN_DRAG_THRESHOLD) {
        setIsRealSwipe(true);
        if (lockedDirection() === null) {
          if (hasHorizontal() && hasVertical()) {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            setLockedDirection(absX > absY ? 'horizontal' : 'vertical');
          }
        }
      }
    }

    let candidate: SwipeDirection | undefined;
    if (!intendedSwipeDirectionRef) {
      if (lockedDirection() === 'vertical') {
        if (deltaY > 0) {
          candidate = 'down';
        } else if (deltaY < 0) {
          candidate = 'up';
        }
      } else if (lockedDirection() === 'horizontal') {
        if (deltaX > 0) {
          candidate = 'right';
        } else if (deltaX < 0) {
          candidate = 'left';
        }
      } else if (Math.abs(deltaX) >= Math.abs(deltaY)) {
        candidate = deltaX > 0 ? 'right' : 'left';
      } else {
        candidate = deltaY > 0 ? 'down' : 'up';
      }

      if (candidate) {
        const isAllowed =
          (candidate === 'left' && allowLeft()) ||
          (candidate === 'right' && allowRight()) ||
          (candidate === 'up' && allowUp()) ||
          (candidate === 'down' && allowDown());
        if (isAllowed) {
          intendedSwipeDirectionRef = candidate;
          maxSwipeDisplacementRef = getDisplacement(candidate, deltaX, deltaY);
          setCurrentSwipeDirection(candidate);
          resolveSwipeThreshold(candidate);
        }
      }
    } else {
      const direction = intendedSwipeDirectionRef;
      const currentDisplacement = getDisplacement(direction, cancelDeltaX, cancelDeltaY);
      if (currentDisplacement > swipeThresholdRef) {
        cancelledSwipeRef = false;
        setCurrentSwipeDirection(direction);
      } else if (
        !(allowLeft() && allowRight()) &&
        !(allowUp() && allowDown()) &&
        maxSwipeDisplacementRef - currentDisplacement >= REVERSE_CANCEL_THRESHOLD
      ) {
        // Mark that a change-of-mind has occurred
        cancelledSwipeRef = true;
      }
    }

    const dampedDelta = applyDirectionalDamping(deltaX, deltaY);
    let newOffsetX = initialTransformRef.x;
    let newOffsetY = initialTransformRef.y;

    if (lockedDirection() === 'horizontal') {
      if (hasHorizontal()) {
        newOffsetX += dampedDelta.x;
      }
    } else if (lockedDirection() === 'vertical') {
      if (hasVertical()) {
        newOffsetY += dampedDelta.y;
      }
    } else {
      if (hasHorizontal()) {
        newOffsetX += dampedDelta.x;
      }
      if (hasVertical()) {
        newOffsetY += dampedDelta.y;
      }
    }

    dragOffsetRef = { x: newOffsetX, y: newOffsetY };
    if (trackDrag()) {
      setDragOffset({ x: newOffsetX, y: newOffsetY });
    }
    recordDragSample({ x: newOffsetX, y: newOffsetY }, getValidTimeStamp(event.timeStamp));
    const dragDeltaX = newOffsetX - initialTransformRef.x;
    const dragDeltaY = newOffsetY - initialTransformRef.y;
    const swipeDirectionDetails = intendedSwipeDirectionRef;

    const progressDirection = primaryDirection() ?? intendedSwipeDirectionRef;
    if (!progressDirection) {
      updateSwipeProgress(0, {
        deltaX: dragDeltaX,
        deltaY: dragDeltaY,
        direction: swipeDirectionDetails,
      });
      return;
    }

    const size =
      progressDirection === 'left' || progressDirection === 'right'
        ? elementSizeRef.width
        : elementSizeRef.height;
    const scale = initialTransformRef.scale || 1;
    if (size <= 0 || scale <= 0) {
      updateSwipeProgress(0, {
        deltaX: dragDeltaX,
        deltaY: dragDeltaY,
        direction: swipeDirectionDetails,
      });
      return;
    }

    const progressDisplacement = getDisplacement(
      progressDirection,
      newOffsetX - initialTransformRef.x,
      newOffsetY - initialTransformRef.y,
    );
    if (progressDisplacement <= 0) {
      updateSwipeProgress(0, {
        deltaX: dragDeltaX,
        deltaY: dragDeltaY,
        direction: swipeDirectionDetails,
      });
      return;
    }

    updateSwipeProgress(progressDisplacement / (size * scale), {
      deltaX: dragDeltaX,
      deltaY: dragDeltaY,
      direction: swipeDirectionDetails,
    });
  }

  const handleMove = (event: SwipeDismissMoveEvent) => {
    const currentPos = getPrimaryPointerPosition(event);
    if (!currentPos) {
      return;
    }

    if (!('touches' in event)) {
      const hasPrimaryButton = hasPrimaryMouseButton(event.buttons);
      if (hasPrimaryButton) {
        sawPrimaryButtonsOnMoveRef = true;
      }

      // Cancel the swipe if a non-primary button takes over the interaction.
      // This handles cases where a right-click interrupts dragging.
      const lostPrimaryButtonDuringSwipe = event.buttons === 0 && sawPrimaryButtonsOnMoveRef;
      if ((event.buttons !== 0 && !hasPrimaryButton) || lostPrimaryButtonDuringSwipe) {
        cancelSwipeInteraction(event);
        return;
      }
    }

    if (!isSwiping() && pendingSwipeRef) {
      if (!isTouchLikeEvent(event) && (event.defaultPrevented || event.defaultPrevented)) {
        resetPendingSwipeState();
        return;
      }

      const allowedToStart = options.canStart
        ? options.canStart(currentPos, {
            nativeEvent: event as SwipeDismissNativeEvent,
            direction: primaryDirection(),
          })
        : true;

      if (allowedToStart) {
        const pendingStartPos = pendingSwipeStartPosRef;
        let ignoreScrollableOnStart = false;
        if (isTouchLikeEvent(event)) {
          const element = options.elementRef ?? null;
          if (pendingStartPos && element) {
            const target = getTargetAtPoint(currentPos, event);
            const doc = ownerDocument(element);
            const body = doc.body;
            const scrollTarget = body ? findGestureScrollableTouchTarget(target, body) : null;

            if (
              scrollTarget &&
              (contains(element, scrollTarget) || contains(scrollTarget, element))
            ) {
              const deltaX = currentPos.x - pendingStartPos.x;
              const deltaY = currentPos.y - pendingStartPos.y;
              const canSwipeFromEdge = canSwipeFromScrollEdgeOnPendingMove(
                scrollTarget,
                deltaX,
                deltaY,
              );

              if (canSwipeFromEdge === false) {
                return;
              }

              if (canSwipeFromEdge === true) {
                ignoreScrollableOnStart = true;
              }
            }
          }
        }

        const started = startSwipeAtPosition(event, currentPos, {
          ignoreScrollableTarget: ignoreScrollableOnStart,
          ignoreScrollableAncestors: ignoreScrollableOnStart,
        });
        if (started) {
          if (pendingStartPos && ignoreScrollableOnStart) {
            // Preserve displacement between touchstart and the move that activates swipe from
            // a scroll-edge so quick flicks can dismiss.
            clearPendingSwipeStartState();
            dragStartPosRef = pendingStartPos;
            swipeCancelBaselineRef = pendingStartPos;
            lastMovePosRef = pendingStartPos;
            isFirstPointerMoveRef = false;
          } else {
            // Start from the current in-bounds position without dropping follow-up move
            // displacement; this avoids jumps when entering from outside the element while
            // keeping swipe tracking responsive on the next move.
            clearPendingSwipeStartState();
            swipeFromScrollableRef = false;
          }
        }
      }
    }

    const previousPos = lastMovePosRef;
    const movement =
      previousPos === null
        ? { x: 0, y: 0 }
        : { x: currentPos.x - previousPos.x, y: currentPos.y - previousPos.y };

    lastMovePosRef = currentPos;
    handleMoveCore(event, currentPos, movement);
  };

  const handleEnd = (event: SwipeDismissEndEvent) => {
    if (!options.enabled) {
      return;
    }

    const resolvedDragOffset = dragOffsetRef;
    const resolvedInitialTransform = initialTransformRef;
    const releaseDeltaX = resolvedDragOffset.x - resolvedInitialTransform.x;
    const releaseDeltaY = resolvedDragOffset.y - resolvedInitialTransform.y;
    const progressDetails: SwipeProgressDetailsInternal = {
      deltaX: releaseDeltaX,
      deltaY: releaseDeltaY,
      direction: currentSwipeDirection() ?? intendedSwipeDirectionRef,
    };

    if (!isSwipingRef) {
      resetPendingSwipeState();
      updateSwipeProgress(0, progressDetails);
      return;
    }

    setSwiping(false);
    setIsRealSwipe(false);
    setLockedDirection(null);
    resetPendingSwipeState();
    sawPrimaryButtonsOnMoveRef = false;

    const element = options.elementRef;
    if (element) {
      if (!('touches' in event)) {
        safelyChangePointerCapture(element, event.pointerId, 'releasePointerCapture');
      }
    }

    const deltaX = releaseDeltaX;
    const deltaY = releaseDeltaY;
    const startTime = swipeStartTimeRef;
    const endTime = getValidTimeStamp(event.timeStamp);
    const durationMs =
      startTime !== null && endTime !== null && endTime > startTime ? endTime - startTime : 0;
    const velocityDurationMs = durationMs > 0 ? Math.max(durationMs, MIN_VELOCITY_DURATION_MS) : 0;
    const velocityX = velocityDurationMs > 0 ? deltaX / velocityDurationMs : 0;
    const velocityY = velocityDurationMs > 0 ? deltaY / velocityDurationMs : 0;
    let releaseVelocityX = lastDragVelocityRef.x;
    let releaseVelocityY = lastDragVelocityRef.y;
    const lastSample = lastDragSampleRef;
    if (lastSample && endTime !== null && endTime >= lastSample.time) {
      const ageMs = endTime - lastSample.time;
      if (ageMs <= MAX_RELEASE_VELOCITY_AGE_MS) {
        const sampleDurationMs = Math.max(ageMs, MIN_RELEASE_VELOCITY_DURATION_MS);
        const deltaFromLastSampleX = resolvedDragOffset.x - lastSample.x;
        const deltaFromLastSampleY = resolvedDragOffset.y - lastSample.y;
        const sampleVelocityX = deltaFromLastSampleX / sampleDurationMs;
        const sampleVelocityY = deltaFromLastSampleY / sampleDurationMs;
        if (sampleVelocityX !== 0) {
          releaseVelocityX = sampleVelocityX;
        }
        if (sampleVelocityY !== 0) {
          releaseVelocityY = sampleVelocityY;
        }
      } else {
        releaseVelocityX = 0;
        releaseVelocityY = 0;
      }
    }

    const releaseDecision = options.onRelease?.({
      event: event as SwipeDismissNativeEvent,
      direction: currentSwipeDirection() ?? intendedSwipeDirectionRef,
      deltaX,
      deltaY,
      velocityX,
      velocityY,
      releaseVelocityX,
      releaseVelocityY,
    });
    const hasReleaseDecision = typeof releaseDecision === 'boolean';

    if (cancelledSwipeRef && !hasReleaseDecision) {
      batch(() => {
        dragOffsetRef = { x: resolvedInitialTransform.x, y: resolvedInitialTransform.y };
        setDragOffset({ x: resolvedInitialTransform.x, y: resolvedInitialTransform.y });
        setCurrentSwipeDirection(undefined);
        updateSwipeProgress(0, progressDetails);
      });
      return;
    }

    let shouldClose = false;
    let dismissDirection: SwipeDirection | undefined;

    if (hasReleaseDecision) {
      shouldClose = releaseDecision;
      dismissDirection = currentSwipeDirection() ?? intendedSwipeDirectionRef ?? primaryDirection();
    } else {
      for (const direction of options.directions) {
        switch (direction) {
          case 'right':
            if (deltaX > swipeThresholdRef) {
              shouldClose = true;
              dismissDirection = 'right';
            }
            break;
          case 'left':
            if (deltaX < -swipeThresholdRef) {
              shouldClose = true;
              dismissDirection = 'left';
            }
            break;
          case 'down':
            if (deltaY > swipeThresholdRef) {
              shouldClose = true;
              dismissDirection = 'down';
            }
            break;
          case 'up':
            if (deltaY < -swipeThresholdRef) {
              shouldClose = true;
              dismissDirection = 'up';
            }
            break;
          default:
            break;
        }
        if (shouldClose) {
          break;
        }
      }
    }

    batch(() => {
      if (shouldClose && dismissDirection) {
        setCurrentSwipeDirection(dismissDirection);
        setDragDismissed(true);
        options.onDismiss?.(event as SwipeDismissNativeEvent, { direction: dismissDirection });
      } else {
        dragOffsetRef = { x: resolvedInitialTransform.x, y: resolvedInitialTransform.y };
        setDragOffset({ x: resolvedInitialTransform.x, y: resolvedInitialTransform.y });
        setCurrentSwipeDirection(undefined);
        updateSwipeProgress(0, progressDetails);
      }
    });
  };

  const getDragStyles = (): JSX.CSSProperties => {
    const resolvedDragOffset = trackDrag() ? dragOffset() : dragOffsetRef;
    const resolvedInitialTransform = trackDrag() ? initialTransform() : initialTransformRef;

    if (
      !isSwiping() &&
      resolvedDragOffset.x === resolvedInitialTransform.x &&
      resolvedDragOffset.y === resolvedInitialTransform.y &&
      !dragDismissed()
    ) {
      return {
        [options.movementCssVars.x]: '0px',
        [options.movementCssVars.y]: '0px',
      } as JSX.CSSProperties;
    }

    const deltaX = resolvedDragOffset.x - resolvedInitialTransform.x;
    const deltaY = resolvedDragOffset.y - resolvedInitialTransform.y;

    return {
      transition: isSwiping() ? 'none' : undefined,
      // While swiping, freeze the element at its current visual transform so it doesn't snap to the
      // end position.
      transform: isSwiping()
        ? `translateX(${resolvedDragOffset.x}px) translateY(${resolvedDragOffset.y}px) scale(${resolvedInitialTransform.scale})`
        : undefined,
      [options.movementCssVars.x]: `${deltaX}px`,
      [options.movementCssVars.y]: `${deltaY}px`,
    } as JSX.CSSProperties;
  };

  const getPointerProps = () => {
    if (!options.enabled) {
      return {};
    }

    return {
      onPointerDown: handleStart,
      onPointerMove: handleMove,
      onPointerUp: handleEnd,
      onPointerCancel: handleEnd,
    } as const;
  };

  const getTouchProps = () => {
    if (!options.enabled) {
      return {};
    }

    return {
      onTouchStart: handleStart,
      onTouchMove: handleMove,
      onTouchEnd: handleEnd,
      onTouchCancel: handleEnd,
    } as const;
  };

  return {
    get swiping() {
      return isSwiping();
    },
    get swipeDirection() {
      return currentSwipeDirection();
    },
    get dragDismissed() {
      return dragDismissed();
    },
    getPointerProps,
    getTouchProps,
    getDragStyles,
    reset,
  };
}

export namespace useSwipeDismiss {
  export interface SwipeDismissDetails {
    nativeEvent: PointerEvent | TouchEvent;
    direction: SwipeDirection | undefined;
  }

  export type SwipeProgressDetails = SwipeProgressDetailsInternal;

  export interface Options {
    enabled: boolean;
    directions: SwipeDirection[];
    elementRef: HTMLElement | null | undefined;
    movementCssVars: { x: string; y: string };
    /**
     * The minimum distance (in pixels) the pointer must travel from the initial swipe point
     * before the gesture is considered a dismiss.
     * @default 40
     */
    swipeThreshold?:
      | number
      | ((details: { element: HTMLElement; direction: SwipeDirection }) => number)
      | undefined;
    /**
     * If provided, swiping will only begin once this returns true.
     * The predicate is evaluated on start and on subsequent move events while the pointer is down.
     */
    canStart?:
      | ((position: { x: number; y: number }, details: SwipeDismissDetails) => boolean)
      | undefined;
    /**
     * If true, swiping won't start when the gesture begins within a scrollable element.
     * This helps avoid conflicts between scrolling content and swipe-to-dismiss.
     * @default false
     */
    ignoreScrollableAncestors?: boolean | undefined;
    /**
     * If false, touch interactions can start swiping on interactive elements
     * that are ignored during pointer swipes.
     * @default true
     */
    ignoreSelectorWhenTouch?: boolean | undefined;
    /**
     * Whether to update drag offsets in React state on every move.
     * Disable for event-only usage to avoid re-renders.
     * @default true
     */
    trackDrag?: boolean | undefined;
    onSwipeStart?: ((event: PointerEvent | TouchEvent) => void) | undefined;
    onProgress?: ((progress: number, details?: SwipeProgressDetailsInternal) => void) | undefined;
    /**
     * Called when the swipe interaction starts or ends.
     */
    onSwipingChange?: ((swiping: boolean) => void) | undefined;
    /**
     * Called when the swipe interaction ends. Returning `true` or `false`
     * overrides the default dismissal behavior.
     */
    onRelease?:
      | ((details: {
          event: PointerEvent | TouchEvent;
          direction: SwipeDirection | undefined;
          deltaX: number;
          deltaY: number;
          velocityX: number;
          velocityY: number;
          releaseVelocityX: number;
          releaseVelocityY: number;
        }) => boolean | void)
      | undefined;
    onDismiss?:
      | ((event: PointerEvent | TouchEvent, details: { direction: SwipeDirection }) => void)
      | undefined;
  }

  export interface ReturnValue {
    swiping: boolean;
    swipeDirection: SwipeDirection | undefined;
    dragDismissed: boolean;
    getPointerProps: () => {
      onPointerDown?: ((event: PointerEvent) => void) | undefined;
      onPointerMove?: ((event: PointerEvent) => void) | undefined;
      onPointerUp?: ((event: PointerEvent) => void) | undefined;
      onPointerCancel?: ((event: PointerEvent) => void) | undefined;
    };
    getTouchProps: () => {
      onTouchStart?: ((event: TouchEvent) => void) | undefined;
      onTouchMove?: ((event: TouchEvent) => void) | undefined;
      onTouchEnd?: ((event: TouchEvent) => void) | undefined;
      onTouchCancel?: ((event: TouchEvent) => void) | undefined;
    };
    getDragStyles: () => JSX.CSSProperties;
    reset: () => void;
  }
}
