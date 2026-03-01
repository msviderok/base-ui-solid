import { ownerDocument } from '@base-ui/utils/owner';
import { onCleanup, onMount } from 'solid-js';
import { contains, getTarget, stopEvent } from '../../floating-ui-solid/utils';
import { useMenuRootContext } from '../../menu/root/MenuRootContext';
import { findRootOwnerId } from '../../menu/utils/findRootOwnerId';
import { splitComponentProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { useContextMenuRootContext } from '../root/ContextMenuRootContext';

const LONG_PRESS_DELAY = 500;

/**
 * An area that opens the menu on right click or long press.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Context Menu](https://base-ui.com/react/components/context-menu)
 */
export function ContextMenuTrigger(componentProps: ContextMenuTrigger.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const {
    anchor,
    backdropRef,
    internalBackdropRef,
    actionsRef,
    positionerRef,
    allowMouseUpTriggerRef,
    initialCursorPointRef,
    rootId,
  } = useContextMenuRootContext(false);

  const { store } = useMenuRootContext(false);
  const open = store.useState('open');
  const disabled = store.useState('disabled');

  let triggerRef = null as HTMLDivElement | null | undefined;
  let touchPositionRef = null as { x: number; y: number } | null;
  let allowMouseUpRef = false;
  const longPressTimeout = useTimeout();
  const allowMouseUpTimeout = useTimeout();

  function handleLongPress(x: number, y: number, event: MouseEvent | TouchEvent) {
    const isTouchEvent = event.type.startsWith('touch');

    initialCursorPointRef.current = { x, y };

    anchor.getBoundingClientRect = () => {
      return DOMRect.fromRect({
        width: isTouchEvent ? 10 : 0,
        height: isTouchEvent ? 10 : 0,
        x,
        y,
      });
    };

    allowMouseUpRef = false;
    actionsRef.current?.setOpen(true, createChangeEventDetails(REASONS.triggerPress, event));

    allowMouseUpTimeout.start(LONG_PRESS_DELAY, () => {
      allowMouseUpRef = true;
    });
  }

  function handleContextMenu(event: MouseEvent) {
    if (disabled()) {
      return;
    }
    allowMouseUpTriggerRef.current = true;
    stopEvent(event);
    handleLongPress(event.clientX, event.clientY, event);
    const doc = ownerDocument(triggerRef as Element);

    doc.addEventListener(
      'mouseup',
      (mouseEvent: MouseEvent) => {
        allowMouseUpTriggerRef.current = false;

        if (!allowMouseUpRef) {
          return;
        }

        allowMouseUpTimeout.clear();
        allowMouseUpRef = false;

        const mouseUpTarget = getTarget(mouseEvent) as Element | null;

        if (contains(positionerRef.current, mouseUpTarget)) {
          return;
        }

        if (rootId() && mouseUpTarget && findRootOwnerId(mouseUpTarget) === rootId()) {
          return;
        }

        actionsRef.current?.setOpen(
          false,
          createChangeEventDetails(REASONS.cancelOpen, mouseEvent),
        );
      },
      { once: true },
    );
  }

  function handleTouchStart(event: TouchEvent) {
    if (disabled()) {
      return;
    }
    allowMouseUpTriggerRef.current = false;
    if (event.touches.length === 1) {
      event.stopPropagation();
      const touch = event.touches[0];
      touchPositionRef = { x: touch.clientX, y: touch.clientY };
      longPressTimeout.start(LONG_PRESS_DELAY, () => {
        if (touchPositionRef) {
          handleLongPress(touchPositionRef.x, touchPositionRef.y, event);
        }
      });
    }
  }

  function handleTouchMove(event: TouchEvent) {
    if (longPressTimeout.isStarted() && touchPositionRef && event.touches.length === 1) {
      const touch = event.touches[0];
      const moveThreshold = 10;

      const deltaX = Math.abs(touch.clientX - touchPositionRef.x);
      const deltaY = Math.abs(touch.clientY - touchPositionRef.y);

      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        longPressTimeout.clear();
      }
    }
  }

  const handleTouchEnd = () => {
    longPressTimeout.clear();
    touchPositionRef = null;
  };

  function handleDocumentContextMenu(event: MouseEvent) {
    if (disabled()) {
      return;
    }
    const target = getTarget(event);
    const targetElement = target as HTMLElement | null;
    if (
      contains(triggerRef, targetElement) ||
      contains(internalBackdropRef.current, targetElement) ||
      contains(backdropRef.current, targetElement)
    ) {
      event.preventDefault();
    }
  }

  onMount(() => {
    const doc = ownerDocument(triggerRef ?? null);
    doc.addEventListener('contextmenu', handleDocumentContextMenu);
    onCleanup(() => {
      doc.removeEventListener('contextmenu', handleDocumentContextMenu);
    });
  });

  const state: ContextMenuTrigger.State = {
    get open() {
      return open();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      triggerRef = el;
    },
    props: [
      {
        onContextMenu: handleContextMenu,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchEnd,
        style: {
          '-webkit-touch-callout': 'none',
        },
      },
      elementProps,
    ],
    stateAttributesMapping: pressableTriggerOpenStateMapping,
  });

  return <>{element()}</>;
}

export type ContextMenuTriggerState = {
  /**
   * Whether the context menu is currently open.
   */
  open: boolean;
};

export interface ContextMenuTriggerProps extends BaseUIComponentProps<
  'div',
  ContextMenuTrigger.State
> {}

export namespace ContextMenuTrigger {
  export type State = ContextMenuTriggerState;
  export type Props = ContextMenuTriggerProps;
}
