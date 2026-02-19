import { ownerDocument } from '@base-ui/utils/owner';
import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { activeElement, contains, getTarget } from '../../floating-ui-solid/utils';
import { splitComponentProps, type CodependentRefs } from '../../solid-helpers';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import type { ToastObject as ToastObjectType } from '../useToastManager';
import { ToastRootContext } from './ToastRootContext';
import { ToastRootCssVars } from './ToastRootCssVars';

const stateAttributesMapping: StateAttributesMapping<ToastRoot.State> = {
  ...transitionStatusMapping,
  swipeDirection(value) {
    return value ? { 'data-swipe-direction': value } : null;
  },
};

const SWIPE_THRESHOLD = 40;
const REVERSE_CANCEL_THRESHOLD = 10;
const OPPOSITE_DIRECTION_DAMPING_FACTOR = 0.5;
const MIN_DRAG_THRESHOLD = 1;

function getDisplacement(
  direction: 'up' | 'down' | 'left' | 'right',
  deltaX: number,
  deltaY: number,
) {
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

function getElementTransform(element: HTMLElement) {
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

/**
 * Groups all parts of an individual toast.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastRoot(componentProps: ToastRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['toast', 'swipeDirection']);
  const swipeDirection = () => local.swipeDirection ?? ['down', 'right'];

  const isAnchored = () => local.toast.positionerProps?.anchor !== undefined;

  const swipeDirections = createMemo<('up' | 'down' | 'left' | 'right')[]>(() => {
    if (isAnchored()) {
      return [];
    }
    const dirs = swipeDirection();
    return Array.isArray(dirs) ? dirs : [dirs];
  });

  const swipeEnabled = () => swipeDirections().length > 0;

  const store = useToastProviderContext();

  const [currentSwipeDirection, setCurrentSwipeDirection] = createSignal<
    'up' | 'down' | 'left' | 'right' | undefined
  >(undefined);
  const [isSwiping, setIsSwiping] = createSignal(false);
  const [isRealSwipe, setIsRealSwipe] = createSignal(false);
  const [dragDismissed, setDragDismissed] = createSignal(false);
  const [dragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = createSignal({ x: 0, y: 0, scale: 1 });
  const [titleId, setTitleId] = createSignal<string | undefined>();
  const [descriptionId, setDescriptionId] = createSignal<string | undefined>();
  const [lockedDirection, setLockedDirection] = createSignal<'horizontal' | 'vertical' | null>(
    null,
  );
  const [codependentRefs, setCodependentRefs] = createStore<
    CodependentRefs<['title', 'description']>
  >({});

  const refs: ToastRootContext['refs'] = {
    rootRef: null,
  };

  let dragStartPosRef = { x: 0, y: 0 };
  let initialTransformRef = { x: 0, y: 0, scale: 1 };
  let intendedSwipeDirectionRef = undefined as 'up' | 'down' | 'left' | 'right' | undefined;
  let maxSwipeDisplacementRef = 0;
  let cancelledSwipeRef = false;
  let swipeCancelBaselineRef = { x: 0, y: 0 };
  let isFirstPointerMoveRef = false;

  const domIndex = store.useState('toastIndex', () => local.toast.id);
  const visibleIndex = store.useState('toastVisibleIndex', () => local.toast.id);
  const offsetY = store.useState('toastOffsetY', () => local.toast.id);
  const focused = store.useState('focused');
  const expanded = store.useState('expanded');

  useOpenChangeComplete({
    open: () => local.toast.transitionStatus !== 'ending',
    ref: () => refs.rootRef,
    onComplete() {
      if (local.toast.transitionStatus === 'ending') {
        store.removeToast(() => local.toast.id);
      }
    },
  });

  /**
   * Recalculates the natural height of the toast and updates it in the toast manager.
   * @param flushSync Whether to flush the update synchronously. Use in observer
   * callbacks to avoid visual flickers.
   */
  const recalculateHeight = () => {
    const element = refs.rootRef;
    if (!element) {
      return;
    }

    const previousHeight = element.style.height;
    element.style.height = 'auto';
    const height = element.offsetHeight;
    element.style.height = previousHeight;

    function update() {
      store.updateToastInternal(() => local.toast.id, {
        ref: refs.rootRef,
        height,
        ...(local.toast.transitionStatus === 'starting' ? { transitionStatus: undefined } : {}),
      });
    }
    update();
  };

  // TODO: Keep this in SolidJS?
  onMount(() => {
    if (typeof ResizeObserver === 'function' && refs.rootRef) {
      const resizeObserver = new ResizeObserver(recalculateHeight);
      resizeObserver.observe(refs.rootRef);
      onCleanup(() => {
        resizeObserver.disconnect();
      });
      return;
    }

    recalculateHeight();
  });

  function applyDirectionalDamping(deltaX: number, deltaY: number) {
    let newDeltaX = deltaX;
    let newDeltaY = deltaY;

    if (!swipeDirections().includes('left') && !swipeDirections().includes('right')) {
      newDeltaX =
        deltaX > 0
          ? deltaX ** OPPOSITE_DIRECTION_DAMPING_FACTOR
          : -(Math.abs(deltaX) ** OPPOSITE_DIRECTION_DAMPING_FACTOR);
    } else {
      if (!swipeDirections().includes('right') && deltaX > 0) {
        newDeltaX = deltaX ** OPPOSITE_DIRECTION_DAMPING_FACTOR;
      }
      if (!swipeDirections().includes('left') && deltaX < 0) {
        newDeltaX = -(Math.abs(deltaX) ** OPPOSITE_DIRECTION_DAMPING_FACTOR);
      }
    }

    if (!swipeDirections().includes('up') && !swipeDirections().includes('down')) {
      newDeltaY =
        deltaY > 0
          ? deltaY ** OPPOSITE_DIRECTION_DAMPING_FACTOR
          : -(Math.abs(deltaY) ** OPPOSITE_DIRECTION_DAMPING_FACTOR);
    } else {
      if (!swipeDirections().includes('down') && deltaY > 0) {
        newDeltaY = deltaY ** OPPOSITE_DIRECTION_DAMPING_FACTOR;
      }
      if (!swipeDirections().includes('up') && deltaY < 0) {
        newDeltaY = -(Math.abs(deltaY) ** OPPOSITE_DIRECTION_DAMPING_FACTOR);
      }
    }

    return { x: newDeltaX, y: newDeltaY };
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }

    if (event.pointerType === 'touch') {
      store.pauseTimers();
    }

    const target = getTarget(event) as HTMLElement | null;

    const isInteractiveElement = target
      ? target.closest('button,a,input,textarea,[role="button"],[data-swipe-ignore]')
      : false;

    if (isInteractiveElement) {
      return;
    }

    cancelledSwipeRef = false;
    intendedSwipeDirectionRef = undefined;
    maxSwipeDisplacementRef = 0;
    dragStartPosRef = { x: event.clientX, y: event.clientY };
    swipeCancelBaselineRef = dragStartPosRef;

    if (refs.rootRef) {
      const transform = getElementTransform(refs.rootRef);
      initialTransformRef = transform;
      setInitialTransform(transform);
      setDragOffset({
        x: transform.x,
        y: transform.y,
      });
    }

    store.setHovering(true);
    setIsSwiping(true);
    setIsRealSwipe(false);
    setLockedDirection(null);
    isFirstPointerMoveRef = true;

    refs.rootRef?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isSwiping()) {
      return;
    }

    // Prevent text selection on Safari
    event.preventDefault();

    if (isFirstPointerMoveRef) {
      // Adjust the starting position to the current position on the first move
      // to account for the delay between pointerdown and the first pointermove on iOS.
      dragStartPosRef = { x: event.clientX, y: event.clientY };
      isFirstPointerMoveRef = false;
    }

    const { clientY, clientX, movementX, movementY } = event;

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
          const hasHorizontal =
            swipeDirections().includes('left') || swipeDirections().includes('right');
          const hasVertical =
            swipeDirections().includes('up') || swipeDirections().includes('down');
          if (hasHorizontal && hasVertical) {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            setLockedDirection(absX > absY ? 'horizontal' : 'vertical');
          }
        }
      }
    }

    let candidate: 'up' | 'down' | 'left' | 'right' | undefined;
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

      if (candidate && swipeDirections().includes(candidate)) {
        intendedSwipeDirectionRef = candidate;
        maxSwipeDisplacementRef = getDisplacement(candidate, deltaX, deltaY);
        setCurrentSwipeDirection(candidate);
      }
    } else {
      const direction = intendedSwipeDirectionRef;
      const currentDisplacement = getDisplacement(direction, cancelDeltaX, cancelDeltaY);
      if (currentDisplacement > SWIPE_THRESHOLD) {
        cancelledSwipeRef = false;
        setCurrentSwipeDirection(direction);
      } else if (
        !(swipeDirections().includes('left') && swipeDirections().includes('right')) &&
        !(swipeDirections().includes('up') && swipeDirections().includes('down')) &&
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
      if (swipeDirections().includes('left') || swipeDirections().includes('right')) {
        newOffsetX += dampedDelta.x;
      }
    } else if (lockedDirection() === 'vertical') {
      if (swipeDirections().includes('up') || swipeDirections().includes('down')) {
        newOffsetY += dampedDelta.y;
      }
    } else {
      if (swipeDirections().includes('left') || swipeDirections().includes('right')) {
        newOffsetX += dampedDelta.x;
      }
      if (swipeDirections().includes('up') || swipeDirections().includes('down')) {
        newOffsetY += dampedDelta.y;
      }
    }

    setDragOffset({ x: newOffsetX, y: newOffsetY });
  }

  function handlePointerUp(event: PointerEvent) {
    if (!isSwiping()) {
      return;
    }

    setIsSwiping(false);
    setIsRealSwipe(false);
    setLockedDirection(null);

    refs.rootRef?.releasePointerCapture(event.pointerId);

    if (cancelledSwipeRef) {
      setDragOffset({ x: initialTransform().x, y: initialTransform().y });
      setCurrentSwipeDirection(undefined);
      return;
    }

    let shouldClose = false;
    const deltaX = dragOffset().x - initialTransform().x;
    const deltaY = dragOffset().y - initialTransform().y;
    let dismissDirection: 'up' | 'down' | 'left' | 'right' | undefined;

    for (const direction of swipeDirections()) {
      switch (direction) {
        case 'right':
          if (deltaX > SWIPE_THRESHOLD) {
            shouldClose = true;
            dismissDirection = 'right';
          }
          break;
        case 'left':
          if (deltaX < -SWIPE_THRESHOLD) {
            shouldClose = true;
            dismissDirection = 'left';
          }
          break;
        case 'down':
          if (deltaY > SWIPE_THRESHOLD) {
            shouldClose = true;
            dismissDirection = 'down';
          }
          break;
        case 'up':
          if (deltaY < -SWIPE_THRESHOLD) {
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

    if (shouldClose) {
      setCurrentSwipeDirection(dismissDirection);
      setDragDismissed(true);
      store.closeToast(() => local.toast.id);
    } else {
      setDragOffset({ x: initialTransform().x, y: initialTransform().y });
      setCurrentSwipeDirection(undefined);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (!refs.rootRef || !contains(refs.rootRef, activeElement(ownerDocument(refs.rootRef)))) {
        return;
      }
      store.closeToast(() => local.toast.id);
    }
  }

  createEffect(() => {
    if (!swipeEnabled()) {
      return;
    }

    const element = refs.rootRef;
    if (!element) {
      return;
    }

    function preventDefaultTouchStart(event: TouchEvent) {
      if (contains(element, event.target as HTMLElement | null)) {
        event.preventDefault();
      }
    }

    element.addEventListener('touchmove', preventDefaultTouchStart, { passive: false });
    onCleanup(() => {
      element.removeEventListener('touchmove', preventDefaultTouchStart);
    });
  });

  function getDragStyles() {
    if (
      !isSwiping() &&
      dragOffset().x === initialTransform().x &&
      dragOffset().y === initialTransform().y &&
      !dragDismissed()
    ) {
      return {
        [ToastRootCssVars.swipeMovementX]: '0px',
        [ToastRootCssVars.swipeMovementY]: '0px',
      };
    }

    const deltaX = dragOffset().x - initialTransform().x;
    const deltaY = dragOffset().y - initialTransform().y;

    return {
      transition: isSwiping() ? 'none' : undefined,
      // While swiping, freeze the element at its current visual transform so it doesn't snap to the
      // end position.
      transform: isSwiping()
        ? `translateX(${dragOffset().x}px) translateY(${dragOffset().y}px) scale(${initialTransform().scale})`
        : undefined,
      [ToastRootCssVars.swipeMovementX]: `${deltaX}px`,
      [ToastRootCssVars.swipeMovementY]: `${deltaY}px`,
    };
  }

  const isHighPriority = () => local.toast.priority === 'high';

  const defaultProps: HTMLProps = {
    get role() {
      return isHighPriority() ? 'alertdialog' : 'dialog';
    },
    tabIndex: 0,
    'aria-modal': false,
    get 'aria-labelledby'() {
      return titleId();
    },
    get 'aria-describedby'() {
      return descriptionId();
    },
    get 'aria-hidden'() {
      return isHighPriority() && !focused() ? true : undefined;
    },
    get onPointerDown() {
      return swipeEnabled() ? handlePointerDown : undefined;
    },
    get onPointerMove() {
      return swipeEnabled() ? handlePointerMove : undefined;
    },
    onPointerUp: handlePointerUp,
    onKeyDown: handleKeyDown,
    get inert() {
      return local.toast.limited;
    },
    get style() {
      return {
        ...getDragStyles(),
        [ToastRootCssVars.index as string]:
          local.toast.transitionStatus === 'ending' ? domIndex() : visibleIndex(),
        [ToastRootCssVars.offsetY as string]: `${offsetY()}px`,
        [ToastRootCssVars.height as string]: local.toast.height
          ? `${local.toast.height}px`
          : undefined,
      };
    },
    // TODO: specific for SolidJS
    // onMouseEnter: () => {
    //   refs.viewportRef?.dispatchEvent(new Event('mouseenter'));
    // },
    // TODO: specific for SolidJS
    // onMouseLeave: () => {
    //   refs.viewportRef?.dispatchEvent(new Event('mouseleave'));
    // },
  };

  const toastRoot: ToastRootContext = {
    refs,
    toast: () => local.toast,
    titleId,
    setTitleId,
    descriptionId,
    setDescriptionId,
    swiping: isSwiping,
    swipeDirection: currentSwipeDirection,
    recalculateHeight,
    index: domIndex,
    visibleIndex,
    expanded,
  };

  const state: ToastRoot.State = {
    get transitionStatus() {
      return local.toast.transitionStatus;
    },
    get expanded() {
      return expanded();
    },
    get limited() {
      return local.toast.limited || false;
    },
    get type() {
      return local.toast.type;
    },
    get swiping() {
      return toastRoot.swiping();
    },
    get swipeDirection() {
      return toastRoot.swipeDirection();
    },
  };

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      toastRoot.refs.rootRef = el;
    },
    state,
    stateAttributesMapping,
    props: [defaultProps, elementProps],
  });

  return <ToastRootContext.Provider value={toastRoot}>{element()}</ToastRootContext.Provider>;
}

export type ToastRootToastObject<Data extends object = any> = ToastObjectType<Data>;
export interface ToastRootState {
  transitionStatus: TransitionStatus;
  /** Whether the toasts in the viewport are expanded. */
  expanded: boolean;
  /** Whether the toast was removed due to exceeding the limit. */
  limited: boolean;
  /** The type of the toast. */
  type: string | undefined;
  /** Whether the toast is being swiped. */
  swiping: boolean;
  /** The direction the toast is being swiped. */
  swipeDirection: 'up' | 'down' | 'left' | 'right' | undefined;
}

export interface ToastRootProps extends BaseUIComponentProps<'div', ToastRoot.State> {
  /**
   * The toast to render.
   */
  toast: ToastRootToastObject<any>;
  /**
   * Direction(s) in which the toast can be swiped to dismiss.
   * @default ['down', 'right']
   */
  swipeDirection?:
    | ('up' | 'down' | 'left' | 'right' | ('up' | 'down' | 'left' | 'right')[])
    | undefined;
}

export namespace ToastRoot {
  export type ToastObject<Data extends object = any> = ToastRootToastObject<Data>;
  export type State = ToastRootState;
  export type Props = ToastRootProps;
}
