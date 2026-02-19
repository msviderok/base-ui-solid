import { isWebKit } from '@base-ui/utils/detectBrowser';
import { ownerDocument, ownerWindow } from '@base-ui/utils/owner';
import type { InteractionType } from '@base-ui/utils/useEnhancedClickHandler';
import { createEffect, onCleanup, onMount, type JSX } from 'solid-js';
import { COMPOSITE_KEYS } from '../../composite/composite';
import { useCSPContext } from '../../csp-provider/CSPContext';
import { FloatingFocusManager } from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { useToolbarRootContext } from '../../toolbar/root/ToolbarRootContext';
import { clamp } from '../../utils/clamp';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { getDisabledMountTransitionStyles } from '../../utils/getDisabledMountTransitionStyles';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { isMouseWithinBounds } from '../../utils/isMouseWithinBounds';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import { styleDisableScrollbar, useStyleDisableScrollbar } from '../../utils/styles';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import type { Align, Side } from '../../utils/useAnchorPositioning';
import { useAnimationFrame } from '../../utils/useAnimationFrame';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { useSelectPositionerContext } from '../positioner/SelectPositionerContext';
import { useSelectFloatingContext, useSelectRootContext } from '../root/SelectRootContext';
import { clearStyles, LIST_FUNCTIONAL_STYLES } from './utils';

const SCROLL_EPS_PX = 1;

const stateAttributesMapping: StateAttributesMapping<SelectPopup.State> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
};

/**
 * A container for the select list.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectPopup(componentProps: SelectPopup.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['finalFocus']);

  const {
    store,
    refs: rootRefs,
    onOpenChangeComplete,
    setOpen,
    multiple,
    handleScrollArrowVisibility,
    highlightItemOnHover,
  } = useSelectRootContext();
  const {
    side,
    align,
    alignItemWithTriggerActive,
    setControlledAlignItemWithTrigger,
    refs: positionerRefs,
  } = useSelectPositionerContext();
  const insideToolbar = useToolbarRootContext(true) != null;
  const floatingRootContext = useSelectFloatingContext();

  const csp = useCSPContext();

  const highlightTimeout = useTimeout();

  const id = store.useState('id');
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const popupProps = store.useState('popupProps');
  const transitionStatus = store.useState('transitionStatus');
  const triggerElement = store.useState('triggerElement');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');

  let initialHeightRef = 0;
  let reachedMaxHeightRef = false;
  let maxHeightRef = 0;
  let initialPlacedRef = false;
  let originalPositionerStylesRef = {} as JSX.CSSProperties;

  const scrollArrowFrame = useAnimationFrame();

  const handleScroll = (scroller: HTMLDivElement) => {
    const positionerEl = positionerElement();
    if (!positionerEl || !rootRefs.popupRef || !initialPlacedRef) {
      return;
    }

    if (reachedMaxHeightRef || !alignItemWithTriggerActive()) {
      handleScrollArrowVisibility();
      return;
    }

    const isTopPositioned = positionerEl.style.top === '0px';
    const isBottomPositioned = positionerEl.style.bottom === '0px';

    const currentHeight = positionerEl.getBoundingClientRect().height;
    const doc = ownerDocument(positionerEl);
    const positionerStyles = getComputedStyle(positionerEl);
    const marginTop = parseFloat(positionerStyles.marginTop);
    const marginBottom = parseFloat(positionerStyles.marginBottom);
    const maxPopupHeight = getMaxPopupHeight(getComputedStyle(rootRefs.popupRef));
    const maxAvailableHeight = Math.min(
      doc.documentElement.clientHeight - marginTop - marginBottom,
      maxPopupHeight,
    );

    const scrollTop = scroller.scrollTop;
    const maxScrollTop = getMaxScrollTop(scroller);

    let nextPositionerHeight = 0;
    let nextScrollTop: number | null = null;
    let setReachedMax = false;
    let scrollToMax = false;

    const setHeight = (height: number) => {
      positionerEl.style.height = `${height}px`;
    };

    const handleSmallDiff = (diff: number, targetScrollTop: number) => {
      const heightDelta = clamp(diff, 0, maxAvailableHeight - currentHeight);
      if (heightDelta > 0) {
        // Consume the remaining scroll in height.
        setHeight(currentHeight + heightDelta);
      }
      scroller.scrollTop = targetScrollTop;
      if (maxAvailableHeight - (currentHeight + heightDelta) <= SCROLL_EPS_PX) {
        reachedMaxHeightRef = true;
      }
      handleScrollArrowVisibility();
    };

    if (isTopPositioned) {
      const diff = maxScrollTop - scrollTop;
      const idealHeight = currentHeight + diff;
      const nextHeight = Math.min(idealHeight, maxAvailableHeight);

      nextPositionerHeight = nextHeight;

      if (diff <= SCROLL_EPS_PX) {
        handleSmallDiff(diff, maxScrollTop);
        return;
      }

      if (maxAvailableHeight - nextHeight > SCROLL_EPS_PX) {
        scrollToMax = true;
      } else {
        setReachedMax = true;
      }
    } else if (isBottomPositioned) {
      const diff = scrollTop;
      const idealHeight = currentHeight + diff;
      const nextHeight = Math.min(idealHeight, maxAvailableHeight);
      const overshoot = idealHeight - maxAvailableHeight;

      nextPositionerHeight = nextHeight;

      if (diff <= SCROLL_EPS_PX) {
        handleSmallDiff(diff, 0);
        return;
      }

      if (maxAvailableHeight - nextHeight > SCROLL_EPS_PX) {
        nextScrollTop = 0;
      } else {
        setReachedMax = true;

        if (scrollTop < maxScrollTop) {
          nextScrollTop = scrollTop - (diff - overshoot);
        }
      }
    }

    nextPositionerHeight = Math.ceil(nextPositionerHeight);

    if (nextPositionerHeight !== 0) {
      setHeight(nextPositionerHeight);
    }
    if (scrollToMax || nextScrollTop != null) {
      // Recompute bounds after resizing (clientHeight likely changed).
      const nextMaxScrollTop = getMaxScrollTop(scroller);

      const target = scrollToMax ? nextMaxScrollTop : clamp(nextScrollTop!, 0, nextMaxScrollTop);

      // Avoid adjustments that re-trigger scroll events forever.
      if (Math.abs(scroller.scrollTop - target) > SCROLL_EPS_PX) {
        scroller.scrollTop = target;
      }
    }

    if (setReachedMax || nextPositionerHeight >= maxAvailableHeight - SCROLL_EPS_PX) {
      reachedMaxHeightRef = true;
    }

    handleScrollArrowVisibility();
  };

  onMount(() => {
    rootRefs.scrollHandlerRef = handleScroll;
  });

  useOpenChangeComplete({
    open,
    ref: rootRefs.popupRef,
    onComplete() {
      if (open()) {
        onOpenChangeComplete?.(true);
      }
    },
  });

  const state: SelectPopup.State = {
    get open() {
      return open();
    },
    get transitionStatus() {
      return transitionStatus();
    },
    get side() {
      return side();
    },
    get align() {
      return align();
    },
  };

  createEffect(() => {
    const positionerEl = positionerElement();
    if (!positionerEl || !rootRefs.popupRef || Object.keys(originalPositionerStylesRef).length) {
      return;
    }

    originalPositionerStylesRef = {
      top: positionerEl.style.top || '0',
      left: positionerEl.style.left || '0',
      right: positionerEl.style.right,
      height: positionerEl.style.height,
      bottom: positionerEl.style.bottom,
      'min-height': positionerEl.style.minHeight,
      'max-height': positionerEl.style.maxHeight,
      'margin-top': positionerEl.style.marginTop,
      'margin-bottom': positionerEl.style.marginBottom,
    };
  });

  createEffect(() => {
    if (open() || alignItemWithTriggerActive()) {
      return;
    }

    initialPlacedRef = false;
    reachedMaxHeightRef = false;
    initialHeightRef = 0;
    maxHeightRef = 0;

    clearStyles(positionerElement(), originalPositionerStylesRef);
  });

  createEffect(() => {
    const popupElement = rootRefs.popupRef;
    const positionerEl = positionerElement();
    const triggerEl = triggerElement();
    if (
      !open() ||
      !triggerEl ||
      !positionerEl ||
      !popupElement ||
      store.state.transitionStatus === 'ending'
    ) {
      return;
    }

    if (!alignItemWithTriggerActive()) {
      initialPlacedRef = true;
      scrollArrowFrame.request(handleScrollArrowVisibility);
      popupElement.style.removeProperty('--transform-origin');
      return;
    }

    // Wait for `selectedItemTextRef.current` to be set.
    queueMicrotask(() => {
      // Ensure we remove any transforms that can affect the location of the popup
      // and therefore the calculations.
      const restoreTransformStyles = unsetTransformStyles(popupElement);
      popupElement.style.removeProperty('--transform-origin');

      try {
        const positionerStyles = getComputedStyle(positionerEl);
        const popupStyles = getComputedStyle(popupElement);

        const doc = ownerDocument(triggerEl);
        const win = ownerWindow(positionerEl);
        const triggerRect = triggerEl.getBoundingClientRect();
        const positionerRect = positionerEl.getBoundingClientRect();
        const triggerX = triggerRect.left;
        const triggerHeight = triggerRect.height;
        const scroller = listElement() || popupElement;
        const scrollHeight = scroller.scrollHeight;

        const borderBottom = parseFloat(popupStyles.borderBottomWidth);
        const marginTop = parseFloat(positionerStyles.marginTop) || 10;
        const marginBottom = parseFloat(positionerStyles.marginBottom) || 10;
        const minHeight = parseFloat(positionerStyles.minHeight) || 100;
        const maxPopupHeight = getMaxPopupHeight(popupStyles);

        const paddingLeft = 5;
        const paddingRight = 5;
        const triggerCollisionThreshold = 20;

        const viewportHeight = doc.documentElement.clientHeight - marginTop - marginBottom;
        const viewportWidth = doc.documentElement.clientWidth;
        const availableSpaceBeneathTrigger = viewportHeight - triggerRect.bottom + triggerHeight;

        const textElement = rootRefs.selectedItemTextRef;
        const valueElement = rootRefs.valueRef;

        let textRect: DOMRect | undefined;
        let offsetX = 0;
        let offsetY = 0;

        if (textElement && valueElement) {
          const valueRect = valueElement.getBoundingClientRect();
          textRect = textElement.getBoundingClientRect();

          const valueLeftFromTriggerLeft = valueRect.left - triggerX;
          const textLeftFromPositionerLeft = textRect.left - positionerRect.left;
          const valueCenterFromPositionerTop =
            valueRect.top - triggerRect.top + valueRect.height / 2;
          const textCenterFromTriggerTop = textRect.top - positionerRect.top + textRect.height / 2;

          offsetX = valueLeftFromTriggerLeft - textLeftFromPositionerLeft;
          offsetY = textCenterFromTriggerTop - valueCenterFromPositionerTop;
        }

        const idealHeight = availableSpaceBeneathTrigger + offsetY + marginBottom + borderBottom;
        let height = Math.min(viewportHeight, idealHeight);
        const maxHeight = viewportHeight - marginTop - marginBottom;
        const scrollTop = idealHeight - height;

        const left = Math.max(paddingLeft, triggerX + offsetX);
        const maxRight = viewportWidth - paddingRight;
        const rightOverflow = Math.max(0, left + positionerRect.width - maxRight);

        positionerEl.style.left = `${left - rightOverflow}px`;
        positionerEl.style.height = `${height}px`;
        positionerEl.style.maxHeight = 'auto';
        positionerEl.style.marginTop = `${marginTop}px`;
        positionerEl.style.marginBottom = `${marginBottom}px`;
        popupElement.style.height = '100%';

        const maxScrollTop = scroller.scrollHeight - scroller.clientHeight;
        const isTopPositioned = scrollTop >= maxScrollTop;

        if (isTopPositioned) {
          height = Math.min(viewportHeight, positionerRect.height) - (scrollTop - maxScrollTop);
        }

        // When the trigger is too close to the top or bottom of the viewport, or the minHeight is
        // reached, we fallback to aligning the popup to the trigger as the UX is poor otherwise.
        const fallbackToAlignPopupToTrigger =
          triggerRect.top < triggerCollisionThreshold ||
          triggerRect.bottom > viewportHeight - triggerCollisionThreshold ||
          height < Math.min(scrollHeight, minHeight);

        // Safari doesn't position the popup correctly when pinch-zoomed.
        const isPinchZoomed = (win.visualViewport?.scale ?? 1) !== 1 && isWebKit;

        if (fallbackToAlignPopupToTrigger || isPinchZoomed) {
          initialPlacedRef = true;
          clearStyles(positionerEl, originalPositionerStylesRef);
          setControlledAlignItemWithTrigger(false);
          return;
        }

        if (isTopPositioned) {
          const topOffset = Math.max(0, viewportHeight - idealHeight);
          positionerEl.style.top = positionerRect.height >= maxHeight ? '0' : `${topOffset}px`;
          positionerEl.style.height = `${height}px`;
          scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
          initialHeightRef = Math.max(minHeight, height);
        } else {
          positionerEl.style.bottom = '0';
          initialHeightRef = Math.max(minHeight, height);
          scroller.scrollTop = scrollTop;
        }

        if (textRect) {
          const popupTop = positionerRect.top;
          const popupHeight = positionerRect.height;
          const textCenterY = textRect.top + textRect.height / 2;

          const transformOriginY =
            popupHeight > 0 ? ((textCenterY - popupTop) / popupHeight) * 100 : 50;

          const clampedY = clamp(transformOriginY, 0, 100);

          popupElement.style.setProperty('--transform-origin', `50% ${clampedY}%`);
        }

        if (initialHeightRef === viewportHeight || height >= maxPopupHeight) {
          reachedMaxHeightRef = true;
        }

        handleScrollArrowVisibility();

        // Avoid the `onScroll` event logic from triggering before the popup is placed.
        setTimeout(() => {
          initialPlacedRef = true;
        });
      } finally {
        restoreTransformStyles();
      }
    });
  });

  createEffect(() => {
    const positionerEl = positionerElement();
    if (!alignItemWithTriggerActive() || !positionerEl || !open()) {
      return;
    }

    const win = ownerWindow(positionerEl);

    function handleResize(event: UIEvent) {
      setOpen(false, createChangeEventDetails(REASONS.windowResize, event));
    }

    win.addEventListener('resize', handleResize);

    onCleanup(() => {
      win.removeEventListener('resize', handleResize);
    });
  });

  const defaultProps: HTMLProps = {
    get role() {
      return listElement() ? 'presentation' : 'listbox';
    },
    ['aria-orientation' as string]: undefined,
    get ['aria-multiselectable' as string]() {
      return listElement() ? undefined : multiple() || undefined;
    },
    get id() {
      return listElement() ? undefined : `${id()}-list`;
    },
    onKeyDown(event) {
      rootRefs.keyboardActiveRef = true;
      if (insideToolbar && COMPOSITE_KEYS.has(event.key)) {
        event.stopPropagation();
      }
    },
    onMouseMove() {
      rootRefs.keyboardActiveRef = false;
    },
    onPointerLeave(event) {
      if (!highlightItemOnHover() || isMouseWithinBounds(event) || event.pointerType === 'touch') {
        return;
      }

      const popup = event.currentTarget;

      highlightTimeout.start(0, () => {
        store.set('activeIndex', null);
        popup.focus({ preventScroll: true });
      });
    },
    onScroll(event) {
      if (listElement()) {
        return;
      }
      handleScroll(event.currentTarget);
    },
    get style() {
      if (alignItemWithTriggerActive()) {
        return listElement() ? { height: '100%' } : LIST_FUNCTIONAL_STYLES;
      }
      return undefined;
    },
  };

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      rootRefs.popupRef = el;
    },
    state,
    stateAttributesMapping,
    get props() {
      return [
        popupProps(),
        defaultProps,
        getDisabledMountTransitionStyles(transitionStatus()),
        {
          get class() {
            return !listElement() && alignItemWithTriggerActive()
              ? styleDisableScrollbar.class
              : undefined;
          },
        },
        elementProps,
      ];
    },
  });

  useStyleDisableScrollbar(csp);

  return (
    <>
      <FloatingFocusManager
        context={floatingRootContext}
        modal={false}
        disabled={!mounted()}
        returnFocus={local.finalFocus}
        restoreFocus
      >
        {element()}
      </FloatingFocusManager>
    </>
  );
}

export interface SelectPopupProps extends BaseUIComponentProps<'div', SelectPopup.State> {
  children?: JSX.Element;
  /**
   * Determines the element to focus when the select popup is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | (
        | boolean
        | HTMLElement
        | null
        | ((closeType: InteractionType) => boolean | HTMLElement | null | undefined | void)
      )
    | undefined;
}

export interface SelectPopupState {
  side: Side | 'none';
  align: Align;
  open: boolean;
  transitionStatus: TransitionStatus;
}

export namespace SelectPopup {
  export type Props = SelectPopupProps;
  export type State = SelectPopupState;
}

function getMaxPopupHeight(popupStyles: CSSStyleDeclaration) {
  const maxHeightStyle = popupStyles.maxHeight || '';
  return maxHeightStyle.endsWith('px') ? parseFloat(maxHeightStyle) || Infinity : Infinity;
}

function getMaxScrollTop(scroller: HTMLElement) {
  return Math.max(0, scroller.scrollHeight - scroller.clientHeight);
}

const TRANSFORM_STYLE_RESETS = [
  ['transform', 'none'],
  ['scale', '1'],
  ['translate', '0 0'],
] as const;

type TransformStyleProperty = (typeof TRANSFORM_STYLE_RESETS)[number][0];

function unsetTransformStyles(popupElement: HTMLElement) {
  const { style } = popupElement;
  const originalStyles = {} as Record<TransformStyleProperty, string>;

  for (const [property, value] of TRANSFORM_STYLE_RESETS) {
    originalStyles[property] = style.getPropertyValue(property);
    style.setProperty(property, value, 'important');
  }

  return () => {
    for (const [property] of TRANSFORM_STYLE_RESETS) {
      const originalValue = originalStyles[property];
      if (originalValue) {
        style.setProperty(property, originalValue);
      } else {
        style.removeProperty(property);
      }
    }
  };
}
