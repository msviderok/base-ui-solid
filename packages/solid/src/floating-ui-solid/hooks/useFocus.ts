import { isMac, isSafari } from '@base-ui/utils/detectBrowser';
import { ownerDocument } from '@base-ui/utils/owner';
import { getWindow, isElement, isHTMLElement } from '@floating-ui/utils/dom';
import { createEffect, createMemo, onCleanup, type Accessor } from 'solid-js';
import { useTimeout } from '../../utils/useTimeout';
import {
  activeElement,
  contains,
  getTarget,
  isTargetInsideEnabledTrigger,
  isTypeableElement,
  matchesFocusVisible,
} from '../utils';

import { access, type MaybeAccessor } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { FloatingUIOpenChangeDetails } from '../../utils/types';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import { createAttribute } from '../utils/createAttribute';

const isMacSafari = isMac && isSafari;

export interface UseFocusProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: MaybeAccessor<boolean | undefined>;
  /**
   * Waits for the specified time before opening.
   * @default undefined
   */
  delay?: MaybeAccessor<number | undefined>;
}

/**
 * Opens the floating element while the reference element has focus, like CSS
 * `:focus`.
 * @see https://floating-ui.com/docs/useFocus
 */
export function useFocus(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  props: UseFocusProps = {},
): Accessor<ElementProps> {
  const context = () => access(contextProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const events = () => store().context.events;
  const dataRef = () => store().context.dataRef;
  const enabled = () => access(props.enabled) ?? true;
  const delay = () => access(props.delay);

  let blockFocusRef = false;
  // Track which reference should be blocked from re-opening after Escape/press dismissal.
  let blockedReferenceRef = null as Element | null | undefined;
  let keyboardModalityRef = true;
  const timeout = useTimeout();

  // If the reference was focused and the user left the tab/window, and the
  // floating element was not open, the focus should be blocked when they
  // return to the tab/window.
  function onBlur() {
    const currentDomReference = store().select('domReferenceElement');
    if (
      !store().select('open') &&
      isHTMLElement(currentDomReference) &&
      currentDomReference === activeElement(ownerDocument(currentDomReference))
    ) {
      blockFocusRef = true;
    }
  }

  createEffect(() => {
    const domReference = store().select('domReferenceElement');
    if (!enabled()) {
      return;
    }

    const win = getWindow(domReference);

    function onKeyDown() {
      keyboardModalityRef = true;
    }

    function onPointerDown() {
      keyboardModalityRef = false;
    }

    win.addEventListener('blur', onBlur);

    if (isMacSafari) {
      win.addEventListener('keydown', onKeyDown, true);
      win.addEventListener('pointerdown', onPointerDown, true);
    }

    onCleanup(() => {
      win.removeEventListener('blur', onBlur);

      if (isMacSafari) {
        win.removeEventListener('keydown', onKeyDown, true);
        win.removeEventListener('pointerdown', onPointerDown, true);
      }
    });
  });

  function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
    if (details.reason === REASONS.triggerPress || details.reason === REASONS.escapeKey) {
      const referenceElement = store().select('domReferenceElement');
      if (isElement(referenceElement)) {
        blockedReferenceRef = referenceElement;
        blockFocusRef = true;
      }
    }
  }

  createEffect(() => {
    if (!enabled()) {
      return;
    }

    events().on('openchange', onOpenChangeLocal);
    onCleanup(() => {
      events().off('openchange', onOpenChangeLocal);
    });
  });

  const reference = createMemo<ElementProps['reference']>(() => ({
    onMouseLeave: () => {
      blockFocusRef = false;
      blockedReferenceRef = null;
    },
    onFocus: (event) => {
      const focusTarget = event.currentTarget as Element;
      if (blockFocusRef) {
        if (blockedReferenceRef === focusTarget) {
          return;
        }

        blockFocusRef = false;
        blockedReferenceRef = null;
      }

      const target = getTarget(event);

      if (isElement(target)) {
        // Safari fails to match `:focus-visible` if focus was initially
        // outside the document.
        if (isMacSafari && !event.relatedTarget) {
          if (!keyboardModalityRef && !isTypeableElement(target)) {
            return;
          }
        } else if (!matchesFocusVisible(target)) {
          return;
        }
      }

      const movedFromOtherEnabledTrigger = isTargetInsideEnabledTrigger(
        event.relatedTarget,
        store().context.triggerElements,
      );

      const { currentTarget } = event;
      const delayValue = delay();

      if (
        (store().select('open') && movedFromOtherEnabledTrigger) ||
        delayValue === 0 ||
        delayValue === undefined
      ) {
        store().setOpen(
          true,
          createChangeEventDetails(REASONS.triggerFocus, event, currentTarget as HTMLElement),
        );
        return;
      }

      timeout.start(delayValue, () => {
        if (blockFocusRef) {
          return;
        }

        store().setOpen(
          true,
          createChangeEventDetails(REASONS.triggerFocus, event, currentTarget as HTMLElement),
        );
      });
    },
    onBlur: (event) => {
      blockFocusRef = false;
      blockedReferenceRef = null;
      const relatedTarget = event.relatedTarget;

      // Hit the non-modal focus management portal guard. Focus will be
      // moved into the floating element immediately after.
      const movedToFocusGuard =
        isElement(relatedTarget) &&
        relatedTarget.hasAttribute(createAttribute('focus-guard')) &&
        relatedTarget.getAttribute('data-type') === 'outside';

      // Wait for the window blur listener to fire.
      timeout.start(0, () => {
        const domReference = store().select('domReferenceElement');
        const activeEl = activeElement(domReference ? domReference.ownerDocument : document);

        // Focus left the page, keep it open.
        if (!relatedTarget && activeEl === domReference) {
          return;
        }

        // When focusing the reference element (e.g. regular click), then
        // clicking into the floating element, prevent it from hiding.
        // Note: it must be focusable, e.g. `tabindex="-1"`.
        // We can not rely on relatedTarget to point to the correct element
        // as it will only point to the shadow host of the newly focused element
        // and not the element that actually has received focus if it is located
        // inside a shadow root.
        if (
          contains(dataRef().floatingContext?.refs.floating(), activeEl) ||
          contains(domReference, activeEl) ||
          movedToFocusGuard
        ) {
          return;
        }

        // If the next focused element is one of the triggers, do not close
        // the floating element. The focus handler of that trigger will
        // handle the open state.
        const nextFocusedElement = relatedTarget ?? activeEl;
        if (isTargetInsideEnabledTrigger(nextFocusedElement, store().context.triggerElements)) {
          return;
        }

        store().setOpen(false, createChangeEventDetails(REASONS.triggerFocus, event));
      });
    },
  }));

  const returnValue = createMemo<ElementProps>(() => {
    if (!enabled()) {
      return {};
    }

    return { reference: reference(), trigger: reference() };
  });

  return returnValue;
}
