import { getWindow, isHTMLElement } from '@floating-ui/utils/dom';
import { createEffect, createMemo, onCleanup, onMount, type Accessor } from 'solid-js';
import type { ElementProps, FloatingRootContext } from '../../floating-ui-solid';
import { activeElement, contains, getDocument } from '../../floating-ui-solid/utils';
import { access, type MaybeAccessor } from '../../solid-helpers';
import { createChangeEventDetails } from '../createBaseUIEventDetails';
import { useTimeout } from '../useTimeout';

interface UseFocusWithDelayProps {
  delay?: MaybeAccessor<number | undefined>;
}

/**
 * Adds support for delay, since Floating UI's `useFocus` hook does not support it.
 */
export function useFocusWithDelay(
  store: FloatingRootContext,
  props: UseFocusWithDelayProps = {},
): Accessor<ElementProps> {
  const delay = () => access(props.delay);
  const timeout = useTimeout();
  let blockFocusRef = false;

  // If the reference was focused and the user left the tab/window, and the preview card was not
  // open, the focus should be blocked when they return to the tab/window.
  function handleBlur() {
    const currentDomReference = store.elements.domReference();
    if (
      !store.open() &&
      isHTMLElement(currentDomReference) &&
      currentDomReference === activeElement(getDocument(currentDomReference))
    ) {
      blockFocusRef = true;
    }
  }

  createEffect(() => {
    const win = getWindow(store.elements.domReference());
    win.addEventListener('blur', handleBlur);
    onCleanup(() => {
      win.removeEventListener('blur', handleBlur);
    });
  });

  const reference = createMemo<ElementProps['reference']>(() => ({
    onFocus(event) {
      const delayValue = delay();
      timeout.start(delayValue ?? 0, () => {
        // store.setOpen(true, createChangeEventDetails(REASONS.triggerFocus, nativeEvent));
        store.onOpenChange(true, event, 'focus');
      });

      timeout.start(props.delay ?? 0, () => {});
    },
    onBlur(event) {
      blockFocusRef = false;
      const { relatedTarget } = event;
      const currentDomReference = store.elements.domReference();

      // Wait for the window blur listener to fire.
      timeout.start(0, () => {
        const activeEl = activeElement(
          currentDomReference ? currentDomReference.ownerDocument : document,
        );

        // Focus left the page, keep it open.
        if (!relatedTarget && activeEl === currentDomReference) {
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
          contains(store.dataRef.floatingContext?.refs.floating(), activeEl) ||
          contains(currentDomReference, activeEl)
        ) {
          return;
        }

        store.onOpenChange(false, event, 'focus');
        // store.setOpen(false, createChangeEventDetails(REASONS.triggerFocus, nativeEvent));
      });
    },
  }));

  const returnValue = createMemo<ElementProps>(() => ({ reference: reference() }));

  return returnValue;
}
