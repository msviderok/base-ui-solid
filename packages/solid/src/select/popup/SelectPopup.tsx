import { isWebKit } from '@base-ui/utils/detectBrowser';
import { ownerDocument, ownerWindow } from '@base-ui/utils/owner';
import { createEffect, onCleanup, onMount, type JSX } from 'solid-js';
import { COMPOSITE_KEYS } from '../../composite/composite';
import { FloatingFocusManager } from '../../floating-ui-solid';
import { mergeProps } from '../../merge-props/mergeProps';
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
  const [, , elementProps] = splitComponentProps(componentProps, []);

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
    const viewportHeight = doc.documentElement.clientHeight - marginTop - marginBottom;

    const scrollTop = scroller.scrollTop;
    const scrollHeight = scroller.scrollHeight;
    const clientHeight = scroller.clientHeight;
    const maxScrollTop = scrollHeight - clientHeight;

    let nextPositionerHeight: number | null = null;
    let nextScrollTop: number | null = null;
    let setReachedMax = false;

    if (isTopPositioned) {
      const diff = maxScrollTop - scrollTop;
      const idealHeight = currentHeight + diff;
      const nextHeight = Math.min(idealHeight, viewportHeight);

      nextPositionerHeight = nextHeight;

      if (nextHeight !== viewportHeight) {
        nextScrollTop = maxScrollTop;
      } else {
        setReachedMax = true;
      }
    } else if (isBottomPositioned) {
      const diff = scrollTop - 0;
      const idealHeight = currentHeight + diff;
      const nextHeight = Math.min(idealHeight, viewportHeight);
      const overshoot = idealHeight - viewportHeight;

      nextPositionerHeight = nextHeight;

      if (nextHeight !== viewportHeight) {
        nextScrollTop = 0;
      } else {
        setReachedMax = true;

        if (scrollTop < maxScrollTop) {
          nextScrollTop = scrollTop - (diff - overshoot);
        }
      }
    }

    if (nextPositionerHeight != null) {
      positionerEl.style.height = `${nextPositionerHeight}px`;
    }
    if (nextScrollTop != null) {
      scroller.scrollTop = nextScrollTop;
    }
    if (setReachedMax) {
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

        if (initialHeightRef === viewportHeight) {
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
      rootRefs.scrollHandlerRef?.(event.currentTarget);
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
    props: [
      (p) => mergeProps(p, popupProps()),
      defaultProps,
      (p) => mergeProps(p, getDisabledMountTransitionStyles(transitionStatus())),
      {
        get class() {
          return !listElement() && alignItemWithTriggerActive()
            ? styleDisableScrollbar.class
            : undefined;
        },
      },
      elementProps,
    ],
  });

  useStyleDisableScrollbar();

  return (
    <>
      <FloatingFocusManager
        context={floatingRootContext}
        modal={false}
        disabled={!mounted()}
        restoreFocus
      >
        {element()}
      </FloatingFocusManager>
    </>
  );
}

export interface SelectPopupProps extends BaseUIComponentProps<'div', SelectPopup.State> {
  children?: JSX.Element;
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

const UNSET_TRANSFORM_STYLES = {
  transform: 'none',
  scale: '1',
  translate: '0 0',
} as const;

type TransformStyleProperty = keyof typeof UNSET_TRANSFORM_STYLES;

function restoreInlineStyleProperty(
  style: CSSStyleDeclaration,
  property: TransformStyleProperty,
  value: string,
) {
  if (value) {
    style.setProperty(property, value);
  } else {
    style.removeProperty(property);
  }
}

function unsetTransformStyles(popupElement: HTMLElement) {
  const { style } = popupElement;

  const originalStyles = {} as Record<TransformStyleProperty, string>;

  const props = Object.keys(UNSET_TRANSFORM_STYLES) as TransformStyleProperty[];

  for (const prop of props) {
    originalStyles[prop] = style.getPropertyValue(prop);
    style.setProperty(prop, UNSET_TRANSFORM_STYLES[prop]);
  }

  return () => {
    for (const prop of props) {
      restoreInlineStyleProperty(style, prop, originalStyles[prop]);
    }
  };
}
