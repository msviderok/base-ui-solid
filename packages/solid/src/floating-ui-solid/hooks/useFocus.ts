import { getWindow, isElement, isHTMLElement } from '@floating-ui/utils/dom';
import { createEffect, createMemo, onCleanup } from 'solid-js';
import { defaultProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { isMac, isSafari } from '../../utils/detectBrowser';
import { ownerDocument } from '../../utils/owner';
import { REASONS } from '../../utils/reasons';
import type { FloatingUIOpenChangeDetails } from '../../utils/types';
import { useTimeout } from '../../utils/useTimeout';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import {
  activeElement,
  contains,
  getTarget,
  isTargetInsideEnabledTrigger,
  isTypeableElement,
  matchesFocusVisible,
} from '../utils';
import { createAttribute } from '../utils/createAttribute';

const isMacSafari = isMac && isSafari;

export interface UseFocusProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Waits for the specified time before opening.
   * @default undefined
   */
  delay?: number | undefined;
}

/**
 * Opens the floating element while the reference element has focus, like CSS
 * `:focus`.
 * @see https://floating-ui.com/docs/useFocus
 */
export function useFocus(parameters: {
  context: FloatingRootContext | FloatingContext;
  props?: UseFocusProps;
}): ElementProps {
  const props = defaultProps(parameters.props ?? {}, { enabled: true });

  const store = () =>
    'rootStore' in parameters.context ? parameters.context.rootStore : parameters.context;
  const events = () => store().context.events;
  const dataRef = () => store().context.dataRef;

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
    if (!props.enabled) {
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
    if (!props.enabled) {
      return;
    }

    events().on('openchange', onOpenChangeLocal);
    onCleanup(() => {
      events().off('openchange', onOpenChangeLocal);
    });
  });

  const reference: ElementProps['reference'] = {
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
      const domReference = store().select('domReferenceElement');
      const focusingDifferentEnabledTrigger =
        isElement(domReference) &&
        isTargetInsideEnabledTrigger(event.currentTarget, store().context.triggerElements) &&
        !contains(domReference, event.currentTarget as Element);

      const { currentTarget } = event;

      if (
        (store().select('open') &&
          (movedFromOtherEnabledTrigger || focusingDifferentEnabledTrigger)) ||
        props.delay === 0 ||
        props.delay === undefined
      ) {
        store().setOpen(
          true,
          createChangeEventDetails(REASONS.triggerFocus, event, currentTarget as HTMLElement),
        );
        return;
      }

      timeout.start(props.delay, () => {
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

      const shouldCloseOnBlur = () => {
        const domReference = store().select('domReferenceElement');
        const activeEl = activeElement(domReference ? domReference.ownerDocument : document);

        // Focus left the page, keep it open.
        if (!relatedTarget && activeEl === domReference) {
          return false;
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
          return false;
        }

        // If the next focused element is one of the triggers, do not close
        // the floating element. The focus handler of that trigger will
        // handle the open state.
        const nextFocusedElement = activeEl ?? relatedTarget;
        if (
          isTargetInsideEnabledTrigger(nextFocusedElement, store().context.triggerElements) ||
          (relatedTarget !== nextFocusedElement &&
            isTargetInsideEnabledTrigger(relatedTarget, store().context.triggerElements))
        ) {
          return false;
        }

        return true;
      };

      // Wait for the window blur listener to fire.
      timeout.start(0, () => {
        if (!shouldCloseOnBlur()) {
          return;
        }

        // Programmatic focus transitions between triggers can settle one task
        // later in Chromium. Re-check once more before closing.
        timeout.start(0, () => {
          if (!shouldCloseOnBlur()) {
            return;
          }

          store().setOpen(false, createChangeEventDetails(REASONS.triggerFocus, event));
        });
      });
    },
  };

  return {
    get reference() {
      return props.enabled ? reference : undefined;
    },
    get trigger() {
      return props.enabled ? reference : undefined;
    },
  };
}
