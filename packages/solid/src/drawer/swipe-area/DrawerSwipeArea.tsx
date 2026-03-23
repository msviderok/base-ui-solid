import { createEffect, createSignal, onCleanup } from 'solid-js';
import { useDialogRootContext } from '../../dialog/root/DialogRootContext';
import { splitComponentProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { useTriggerRegistration } from '../../utils/popups';
import { CommonPopupDataAttributes } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import {
  getDisplacement,
  getElementTransform,
  useSwipeDismiss,
  type SwipeDirection,
} from '../../utils/useSwipeDismiss';
import { useTimeout } from '../../utils/useTimeout';
import { DrawerBackdropCssVars } from '../backdrop/DrawerBackdropCssVars';
import { DrawerPopupCssVars } from '../popup/DrawerPopupCssVars';
import { DrawerPopupDataAttributes } from '../popup/DrawerPopupDataAttributes';
import { useDrawerProviderContext } from '../provider/DrawerProviderContext';
import { useDrawerRootContext, type DrawerSwipeDirection } from '../root/DrawerRootContext';

const DEFAULT_SWIPE_OPEN_RATIO = 0.5;
const MIN_SWIPE_START_DISTANCE = 1;
const VELOCITY_THRESHOLD = 0.1;
const FALLBACK_SWIPE_OPEN_THRESHOLD = 40;

const SWIPE_AREA_OPEN_HOOK: Record<string, string> = {
  [CommonPopupDataAttributes.open]: '',
};

const SWIPE_AREA_CLOSED_HOOK: Record<string, string> = {
  [CommonPopupDataAttributes.closed]: '',
};

const stateAttributesMapping: StateAttributesMapping<DrawerSwipeArea.State> = {
  open(value) {
    return value ? SWIPE_AREA_OPEN_HOOK : SWIPE_AREA_CLOSED_HOOK;
  },
  swiping(value) {
    return value ? { 'data-swiping': '' } : null;
  },
  swipeDirection(value) {
    return value ? { 'data-swipe-direction': value } : null;
  },
  disabled(value) {
    return value ? { 'data-disabled': '' } : null;
  },
};

const oppositeSwipeDirection: Record<DrawerSwipeDirection, DrawerSwipeDirection> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function resolveTouchAction(direction: DrawerSwipeDirection) {
  return direction === 'left' || direction === 'right' ? 'pan-y' : 'pan-x';
}

/**
 * An invisible area that listens for swipe gestures to open the drawer.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export function DrawerSwipeArea(componentProps: DrawerSwipeArea.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'swipeDirection',
  ]);
  const disabled = () => local.disabled ?? false;
  const swipeDirectionProp = () => local.swipeDirection;

  const { store } = useDialogRootContext();
  const { swipeDirection, frontmostHeight } = useDrawerRootContext();
  const providerContext = useDrawerProviderContext(true);

  const [swipeActive, setSwipeActive] = createSignal(false);

  const releaseDismissTimeout = useTimeout();
  let swipeAreaRef = null as HTMLDivElement | null | undefined;
  let swipeStartEventRef = null as PointerEvent | TouchEvent | null | undefined;
  let openedBySwipeRef = false;
  let dragDeltaRef = { x: 0, y: 0 };
  let closedOffsetRef = null as number | null;
  let appliedSwipeStylesRef = false;
  let popupTransitionRef = null as string | null;

  const swipeAreaId = useBaseUiId(() => componentProps.id);
  const registerTrigger = useTriggerRegistration({
    get id() {
      return swipeAreaId();
    },
    store,
  });

  const open = store.useState('open');

  const resolvedSwipeDirection = () =>
    swipeDirectionProp() ?? oppositeSwipeDirection[swipeDirection()];
  const dismissDirection = () => oppositeSwipeDirection[resolvedSwipeDirection()];
  const enabled = () => !disabled() && (!open() || swipeActive());

  const resetDragDelta = () => {
    dragDeltaRef.x = 0;
    dragDeltaRef.y = 0;
  };

  function disableDismissForSwipe() {
    releaseDismissTimeout.clear();
    store.context.outsidePressEnabledRef.current = false;
  }

  function enableDismissAfterRelease() {
    // Safari can dispatch outside-press for the same swipe-open gesture
    // after release, so defer re-enabling dismissal to the next macrotask.
    releaseDismissTimeout.start(0, () => {
      store.context.outsidePressEnabledRef.current = true;
    });
  }

  function resolvePopupSize() {
    const popupElement = store.context.popupRef.current;
    if (!popupElement) {
      return null;
    }

    const isHorizontal = dismissDirection() === 'left' || dismissDirection() === 'right';
    const size = isHorizontal ? popupElement.offsetWidth : popupElement.offsetHeight;
    if (size <= 0) {
      return null;
    }

    return size;
  }

  function resolveClosedOffset() {
    const offset = resolvePopupSize();
    if (offset == null) {
      return null;
    }

    const popupElement = store.context.popupRef.current;
    if (!popupElement) {
      return offset;
    }

    const isHorizontal = dismissDirection() === 'left' || dismissDirection() === 'right';
    const transform = getElementTransform(popupElement);
    const transformOffset = isHorizontal ? transform.x : transform.y;
    if (Number.isFinite(transformOffset) && Math.abs(transformOffset) > 0.5) {
      return Math.min(offset, Math.abs(transformOffset));
    }

    return offset;
  }

  function resolveSwipeOpenThreshold() {
    const popupSize = resolvePopupSize();
    if (popupSize == null) {
      return FALLBACK_SWIPE_OPEN_THRESHOLD;
    }

    return popupSize * DEFAULT_SWIPE_OPEN_RATIO;
  }

  function applySwipeMovement() {
    if (!swipeActive) {
      return;
    }

    const popupElement = store.context.popupRef.current;
    if (!popupElement) {
      return;
    }

    if (!store.select('open') || !store.select('mounted')) {
      return;
    }

    if (closedOffsetRef == null) {
      closedOffsetRef = resolveClosedOffset();
    }

    const closedOffset = closedOffsetRef;
    if (!closedOffset || !Number.isFinite(closedOffset) || closedOffset <= 0) {
      return;
    }

    const { x, y } = dragDeltaRef;
    const displacement = getDisplacement(resolvedSwipeDirection(), x, y);
    const clampedDisplacement = Math.max(0, displacement);
    const dampedDisplacement =
      clampedDisplacement > closedOffset
        ? closedOffset + Math.sqrt(clampedDisplacement - closedOffset)
        : clampedDisplacement;
    const remaining = closedOffset - dampedDisplacement;
    const directionSign = dismissDirection() === 'left' || dismissDirection() === 'up' ? -1 : 1;
    const movement = remaining * directionSign;
    const isHorizontal = dismissDirection() === 'left' || dismissDirection() === 'right';
    const movementX = isHorizontal ? movement : 0;
    const movementY = isHorizontal ? 0 : movement;
    const openProgress = Math.max(0, Math.min(1, clampedDisplacement / closedOffset));
    const backdropProgress = Math.max(0, Math.min(1, 1 - openProgress));

    popupElement.style.setProperty(DrawerPopupCssVars.swipeMovementX, `${movementX}px`);
    popupElement.style.setProperty(DrawerPopupCssVars.swipeMovementY, `${movementY}px`);
    popupElement.setAttribute(DrawerPopupDataAttributes.swiping, '');
    if (popupTransitionRef === null) {
      popupTransitionRef = popupElement.style.transition;
    }
    popupElement.style.transition = 'none';

    const backdropElement = store.context.backdropRef.current;
    if (backdropElement) {
      backdropElement.setAttribute(DrawerPopupDataAttributes.swiping, '');
      backdropElement.style.setProperty(DrawerBackdropCssVars.swipeProgress, `${backdropProgress}`);
      if (openProgress > 0 && frontmostHeight() > 0) {
        backdropElement.style.setProperty(DrawerPopupCssVars.height, `${frontmostHeight()}px`);
      } else {
        backdropElement.style.removeProperty(DrawerPopupCssVars.height);
      }
    }

    providerContext?.setVisualState({
      swipeProgress: openProgress,
      frontmostHeight: openProgress > 0 ? frontmostHeight() : 0,
    });
    appliedSwipeStylesRef = true;
  }

  const clearSwipeStyles = () => {
    const popupElement = store.context.popupRef.current;
    if (popupElement && appliedSwipeStylesRef) {
      popupElement.style.removeProperty(DrawerPopupCssVars.swipeMovementX);
      popupElement.style.removeProperty(DrawerPopupCssVars.swipeMovementY);
      popupElement.removeAttribute(DrawerPopupDataAttributes.swiping);
    }

    if (popupElement && popupTransitionRef !== null) {
      popupElement.style.transition = popupTransitionRef;
      popupTransitionRef = null;
    }

    const backdropElement = store.context.backdropRef.current;
    if (backdropElement) {
      backdropElement.removeAttribute(DrawerPopupDataAttributes.swiping);
      backdropElement.style.setProperty(DrawerBackdropCssVars.swipeProgress, '0');
      backdropElement.style.removeProperty(DrawerPopupCssVars.height);
    }

    providerContext?.setVisualState({ swipeProgress: 0, frontmostHeight: 0 });
    appliedSwipeStylesRef = false;
  };

  function openDrawer(event?: PointerEvent | TouchEvent) {
    if (store.select('open')) {
      return;
    }
    openedBySwipeRef = true;
    store.setOpen(true, createChangeEventDetails(REASONS.swipe, event, swipeAreaRef ?? undefined));
  }

  function closeDrawer(event?: PointerEvent | TouchEvent) {
    if (!store.select('open')) {
      return;
    }
    store.setOpen(false, createChangeEventDetails(REASONS.swipe, event, swipeAreaRef ?? undefined));
  }

  const swipe = useSwipeDismiss({
    get enabled() {
      return enabled();
    },
    get directions() {
      return [resolvedSwipeDirection()];
    },
    elementRef: swipeAreaRef,
    trackDrag: false,
    movementCssVars: {
      x: DrawerPopupCssVars.swipeMovementX,
      y: DrawerPopupCssVars.swipeMovementY,
    },
    onSwipeStart(event) {
      disableDismissForSwipe();
      swipeStartEventRef = event;
      openedBySwipeRef = false;
      setSwipeActive(true);
      resetDragDelta();
    },
    onProgress(_progress, details) {
      if (!details) {
        return;
      }

      if (!swipeStartEventRef) {
        return;
      }

      dragDeltaRef.x = details.deltaX;
      dragDeltaRef.y = details.deltaY;

      if (details.direction !== resolvedSwipeDirection()) {
        return;
      }

      const displacement = getDisplacement(
        resolvedSwipeDirection(),
        details.deltaX,
        details.deltaY,
      );

      if (displacement < MIN_SWIPE_START_DISTANCE && !openedBySwipeRef) {
        return;
      }

      if (!openedBySwipeRef) {
        openDrawer(swipeStartEventRef);
      }

      applySwipeMovement();
    },
    onRelease({ event, direction, deltaX, deltaY, releaseVelocityX, releaseVelocityY }) {
      const displacement = getDisplacement(resolvedSwipeDirection(), deltaX, deltaY);
      const releaseVelocity = getDisplacement(
        resolvedSwipeDirection(),
        releaseVelocityX,
        releaseVelocityY,
      );
      const threshold = resolveSwipeOpenThreshold();
      const hasEnoughDistance = threshold != null && displacement >= threshold;
      const hasEnoughVelocity = releaseVelocity >= VELOCITY_THRESHOLD;
      const shouldOpen =
        threshold != null &&
        direction === resolvedSwipeDirection() &&
        (hasEnoughDistance || hasEnoughVelocity) &&
        !disabled;

      if (shouldOpen) {
        if (!store.select('open')) {
          openDrawer(event);
        }
      } else if (openedBySwipeRef) {
        closeDrawer(event);
      }

      swipeStartEventRef = null;
      openedBySwipeRef = false;
      setSwipeActive(false);
      closedOffsetRef = null;

      enableDismissAfterRelease();
      resetDragDelta();
      clearSwipeStyles();

      return false;
    },
  });

  const swipePointerProps = swipe.getPointerProps();
  const swipeTouchProps = swipe.getTouchProps();
  const resetSwipe = swipe.reset;

  createEffect(() => {
    if (!enabled()) {
      resetSwipe();
      resetDragDelta();
      clearSwipeStyles();
      setSwipeActive(false);
      openedBySwipeRef = false;
      swipeStartEventRef = null;
      closedOffsetRef = null;
    }
  });

  onCleanup(() => {
    store.context.outsidePressEnabledRef.current = true;
  });

  const state: DrawerSwipeArea.State = {
    get open() {
      return open();
    },
    get swiping() {
      return swipe.swiping;
    },
    get swipeDirection() {
      return resolvedSwipeDirection();
    },
    get disabled() {
      return disabled();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      swipeAreaRef = el;
      registerTrigger(el);
    },
    stateAttributesMapping,
    get props() {
      return [
        {
          role: 'presentation',
          'aria-hidden': true,
          get style() {
            return {
              pointerEvents: !enabled() ? 'none' : undefined,
              touchAction: resolveTouchAction(resolvedSwipeDirection()),
            };
          },
          onPointerDown(event: PointerEvent) {
            if (event.pointerType === 'touch') {
              return;
            }
            swipePointerProps.onPointerDown?.(event);
            // Prevent native text selection/drag gestures from competing with swipe-open dragging.
            if (event.cancelable) {
              event.preventDefault();
            }
          },
          onPointerMove(event: PointerEvent) {
            if (event.pointerType === 'touch') {
              return;
            }
            swipePointerProps.onPointerMove?.(event);
          },
          onPointerUp(event: PointerEvent) {
            if (event.pointerType === 'touch') {
              return;
            }
            swipePointerProps.onPointerUp?.(event);
          },
          onPointerCancel(event: PointerEvent) {
            if (event.pointerType === 'touch') {
              return;
            }
            swipePointerProps.onPointerCancel?.(event);
          },
        },
        swipeTouchProps,
        swipeAreaId() ? { id: swipeAreaId() } : undefined,
        elementProps,
      ];
    },
  });

  return <>{element()}</>;
}

export interface DrawerSwipeAreaProps extends BaseUIComponentProps<'div', DrawerSwipeArea.State> {
  /**
   * Whether the swipe area is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The swipe direction that opens the drawer.
   * Defaults to the opposite of `Drawer.Root` `swipeDirection`.
   */
  swipeDirection?: DrawerSwipeDirection | undefined;
}

export interface DrawerSwipeAreaState {
  /**
   * Whether the drawer is currently open.
   */
  open: boolean;
  /**
   * Whether the swipe area is currently being swiped.
   */
  swiping: boolean;
  /**
   * The swipe direction that opens the drawer.
   */
  swipeDirection: SwipeDirection;
  /**
   * Whether the swipe area is disabled.
   */
  disabled: boolean;
}

export namespace DrawerSwipeArea {
  export type Props = DrawerSwipeAreaProps;
  export type State = DrawerSwipeAreaState;
}
