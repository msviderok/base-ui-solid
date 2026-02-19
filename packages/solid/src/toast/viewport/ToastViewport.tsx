import { ownerDocument, ownerWindow } from '@base-ui/utils/owner';
import { createEffect, createMemo, For, onCleanup } from 'solid-js';
import { activeElement, contains, getTarget } from '../../floating-ui-solid/utils';
import { splitComponentProps } from '../../solid-helpers';
import { FocusGuard } from '../../utils/FocusGuard';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { visuallyHidden } from '../../utils/visuallyHidden';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { isFocusVisible } from '../utils/focusVisible';
import { ToastViewportCssVars } from './ToastViewportCssVars';

/**
 * A container viewport for toasts.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastViewport(componentProps: ToastViewport.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const store = useToastProviderContext();
  const windowFocusTimeout = useTimeout();

  let handlingFocusGuardRef = false;
  let markedReadyForMouseLeaveRef = false;

  const isEmpty = store.useState('isEmpty');
  const toasts = store.useState('toasts');
  const focused = store.useState('focused');
  const expanded = store.useState('expanded');
  const prevFocusElement = store.useState('prevFocusElement');
  const frontmostHeight = () => toasts()[0]?.height ?? 0;

  const hasTransitioningToasts = createMemo(() =>
    toasts().some((toast) => toast.transitionStatus === 'ending'),
  );

  // Listen globally for F6 so we can force-focus the viewport.
  createEffect(() => {
    const viewport = store.state.viewport ?? null;
    if (!viewport) {
      return;
    }

    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (isEmpty()) {
        return;
      }

      if (event.key === 'F6' && event.target !== viewport) {
        event.preventDefault();
        store.setPrevFocusElement(activeElement(ownerDocument(viewport)) as HTMLElement | null);
        viewport?.focus({ preventScroll: true });
        store.pauseTimers();
        store.setFocused(true);
      }
    }

    const win = ownerWindow(viewport);

    win.addEventListener('keydown', handleGlobalKeyDown);

    onCleanup(() => {
      win.removeEventListener('keydown', handleGlobalKeyDown);
    });
  });

  createEffect(() => {
    const viewport = store.state.viewport ?? null;
    if (!viewport || isEmpty()) {
      return;
    }

    const win = ownerWindow(viewport);

    function handleWindowBlur(event: FocusEvent) {
      if (event.target !== win) {
        return;
      }

      store.setIsWindowFocused(false);
      store.pauseTimers();
    }

    function handleWindowFocus(event: FocusEvent) {
      if (event.relatedTarget || event.target === win) {
        return;
      }

      const target = getTarget(event);
      const activeEl = activeElement(ownerDocument(viewport));
      if (!contains(viewport, target as HTMLElement | null) || !isFocusVisible(activeEl)) {
        store.resumeTimers();
      }

      // Wait for the `handleFocus` event to fire.
      windowFocusTimeout.start(0, () => store.setIsWindowFocused(true));
    }

    win.addEventListener('blur', handleWindowBlur, true);
    win.addEventListener('focus', handleWindowFocus, true);

    onCleanup(() => {
      win.removeEventListener('blur', handleWindowBlur, true);
      win.removeEventListener('focus', handleWindowFocus, true);
    });
  });

  createEffect(() => {
    const viewport = store.state.viewport ?? null;
    if (!viewport || isEmpty()) {
      return;
    }

    const doc = ownerDocument(viewport);

    doc.addEventListener('pointerdown', store.handleDocumentPointerDown, true);

    onCleanup(() => {
      doc.removeEventListener('pointerdown', store.handleDocumentPointerDown, true);
    });
  });

  function handleFocusGuard(event: FocusEvent) {
    const viewport = store.state.viewport ?? null;
    if (!viewport) {
      return;
    }

    handlingFocusGuardRef = true;

    // If we're coming off the container, move to the first toast
    if (event.relatedTarget === viewport) {
      toasts()[0]?.ref?.focus();
    } else {
      store.restoreFocusToPrevElement();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab' && event.shiftKey && event.target === store.state.viewport) {
      event.preventDefault();
      store.restoreFocusToPrevElement();
      store.resumeTimers();
    }
  }

  createEffect(() => {
    if (!store.state.isWindowFocused || hasTransitioningToasts() || !markedReadyForMouseLeaveRef) {
      return;
    }

    // Once transitions have finished, see if a mouseleave was already triggered
    // but blocked from taking effect. If so, we can now safely resume timers and
    // collapse the viewport.
    store.resumeTimers();
    store.setHovering(false);
    markedReadyForMouseLeaveRef = false;
  });

  function handleMouseEnter() {
    store.pauseTimers();
    store.setHovering(true);
    markedReadyForMouseLeaveRef = false;
  }

  function handleMouseLeave() {
    if (hasTransitioningToasts()) {
      // When swiping to dismiss, wait until the transitions have settled
      // to avoid the viewport collapsing while the user is interacting.
      markedReadyForMouseLeaveRef = true;
    } else {
      store.resumeTimers();
      store.setHovering(false);
    }
  }

  function handleFocus() {
    if (handlingFocusGuardRef) {
      handlingFocusGuardRef = false;
      return;
    }

    if (focused()) {
      return;
    }

    // Only set focused when the active element is focus-visible.
    // This prevents the viewport from staying expanded when clicking inside without
    // keyboard navigation.
    if (isFocusVisible(ownerDocument(store.state.viewport ?? null).activeElement)) {
      store.setFocused(true);
      store.pauseTimers();
    }
  }

  function handleBlur(event: FocusEvent) {
    if (!focused() || contains(store.state.viewport, event.relatedTarget as HTMLElement | null)) {
      return;
    }

    store.setFocused(false);
    store.resumeTimers();
  }

  const defaultProps: HTMLProps = {
    tabIndex: -1,
    role: 'region',
    'aria-live': 'polite',
    'aria-atomic': false,
    'aria-relevant': 'additions text',
    'aria-label': 'Notifications',
    onMouseEnter: handleMouseEnter,
    onMouseMove: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onClick: handleFocus,
  };

  const state: ToastViewport.State = {
    get expanded() {
      return expanded();
    },
  };

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      store.setViewport(el);
    },
    state,
    props: [
      defaultProps,
      {
        get style() {
          return {
            [ToastViewportCssVars.frontmostHeight as string]: frontmostHeight()
              ? `${frontmostHeight()}px`
              : undefined,
          };
        },
      },
      elementProps,
    ],
    get children() {
      return (
        <>
          {!isEmpty() && prevFocusElement() && <FocusGuard onFocus={handleFocusGuard} />}
          {componentProps.children}
          {!isEmpty() && prevFocusElement() && <FocusGuard onFocus={handleFocusGuard} />}
        </>
      );
    },
  });

  const highPriorityToasts = createMemo(() =>
    toasts().filter((toast) => toast.priority === 'high'),
  );

  return (
    <>
      {!isEmpty() && prevFocusElement() && <FocusGuard onFocus={handleFocusGuard} />}
      {element()}
      {!focused() && highPriorityToasts().length > 0 && (
        <div style={visuallyHidden}>
          <For each={highPriorityToasts()}>
            {(toast) => (
              <div role="alert" aria-atomic>
                <div>{toast.title}</div>
                <div>{toast.description}</div>
              </div>
            )}
          </For>
        </div>
      )}
    </>
  );
}

export interface ToastViewportState {
  /**
   * Whether toasts are expanded in the viewport.
   */
  expanded: boolean;
}

export interface ToastViewportProps extends BaseUIComponentProps<'div', ToastViewport.State> {}

export namespace ToastViewport {
  export type State = ToastViewportState;
  export type Props = ToastViewportProps;
}
