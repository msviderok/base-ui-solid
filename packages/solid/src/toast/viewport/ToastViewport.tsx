import { ownerDocument, ownerWindow } from '@base-ui/utils/owner';
import { createEffect, createMemo, For, onCleanup } from 'solid-js';
import { activeElement, contains, getTarget } from '../../floating-ui-solid/utils';
import { splitComponentProps } from '../../solid-helpers';
import { FocusGuard } from '../../utils/FocusGuard';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { visuallyHidden } from '../../utils/visuallyHidden';
import { useToastContext } from '../provider/ToastProviderContext';
import { isFocusVisible } from '../utils/focusVisible';
import { ToastViewportContext } from './ToastViewportContext';
import { ToastViewportCssVars } from './ToastViewportCssVars';

/**
 * A container viewport for toasts.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastViewport(componentProps: ToastViewport.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const {
    toasts,
    pauseTimers,
    resumeTimers,
    setHovering,
    setFocused,
    refs,
    prevFocusElement,
    setPrevFocusElement,
    expanded,
    focused,
  } = useToastContext();

  let handlingFocusGuardRef = false;
  let markedReadyForMouseLeaveRef = false;

  const numToasts = () => toasts.list.length;
  const frontmostHeight = () => toasts.list[0]?.height ?? 0;

  const hasTransitioningToasts = createMemo(() =>
    toasts.list.some((toast) => toast.transitionStatus === 'ending'),
  );

  // Listen globally for F6 so we can force-focus the viewport.
  createEffect(() => {
    if (!refs.viewportRef) {
      return;
    }

    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (numToasts() === 0) {
        return;
      }

      if (event.key === 'F6' && event.target !== refs.viewportRef) {
        event.preventDefault();
        setPrevFocusElement(
          activeElement(ownerDocument(refs.viewportRef ?? null)) as HTMLElement | null,
        );
        refs.viewportRef?.focus({ preventScroll: true });
        pauseTimers();
        setFocused(true);
      }
    }

    const win = ownerWindow(refs.viewportRef);

    win.addEventListener('keydown', handleGlobalKeyDown);

    onCleanup(() => {
      win.removeEventListener('keydown', handleGlobalKeyDown);
    });
  });

  createEffect(() => {
    if (!refs.viewportRef || !numToasts()) {
      return;
    }

    const win = ownerWindow(refs.viewportRef);

    function handleWindowBlur(event: FocusEvent) {
      if (event.target !== win) {
        return;
      }

      refs.windowFocusedRef = false;
      pauseTimers();
    }

    function handleWindowFocus(event: FocusEvent) {
      if (event.relatedTarget || event.target === win) {
        return;
      }

      const target = getTarget(event);
      const activeEl = activeElement(ownerDocument(refs.viewportRef ?? null));
      if (!contains(refs.viewportRef, target as HTMLElement | null) || !isFocusVisible(activeEl)) {
        resumeTimers();
      }

      // Wait for the `handleFocus` event to fire.
      setTimeout(() => {
        refs.windowFocusedRef = true;
      });
    }

    win.addEventListener('blur', handleWindowBlur, true);
    win.addEventListener('focus', handleWindowFocus, true);

    onCleanup(() => {
      win.removeEventListener('blur', handleWindowBlur, true);
      win.removeEventListener('focus', handleWindowFocus, true);
    });
  });

  createEffect(() => {
    const viewportNode = refs.viewportRef;
    if (!viewportNode || numToasts() === 0) {
      return;
    }

    const doc = ownerDocument(viewportNode);

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType !== 'touch') {
        return;
      }

      const target = getTarget(event) as Element | null;
      if (contains(viewportNode, target)) {
        return;
      }

      resumeTimers();
      setHovering(false);
      setFocused(false);
    }

    doc.addEventListener('pointerdown', handlePointerDown, true);

    onCleanup(() => {
      doc.removeEventListener('pointerdown', handlePointerDown, true);
    });
  });

  function handleFocusGuard(event: FocusEvent) {
    if (!refs.viewportRef) {
      return;
    }

    handlingFocusGuardRef = true;

    // If we're coming off the container, move to the first toast
    if (event.relatedTarget === refs.viewportRef) {
      toasts.list[0]?.ref?.focus();
    } else {
      prevFocusElement()?.focus({ preventScroll: true });
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab' && event.shiftKey && event.target === refs.viewportRef) {
      event.preventDefault();
      prevFocusElement()?.focus({ preventScroll: true });
      resumeTimers();
    }
  }

  createEffect(() => {
    if (!refs.windowFocusedRef || hasTransitioningToasts() || !markedReadyForMouseLeaveRef) {
      return;
    }

    // Once transitions have finished, see if a mouseleave was already triggered
    // but blocked from taking effect. If so, we can now safely resume timers and
    // collapse the viewport.
    resumeTimers();
    setHovering(false);
    markedReadyForMouseLeaveRef = false;
  });

  function handleMouseEnter() {
    pauseTimers();
    setHovering(true);
    markedReadyForMouseLeaveRef = false;
  }

  function handleMouseLeave() {
    if (toasts.list.some((toast) => toast.transitionStatus === 'ending')) {
      // When swiping to dismiss, wait until the transitions have settled
      // to avoid the viewport collapsing while the user is interacting.
      markedReadyForMouseLeaveRef = true;
    } else {
      resumeTimers();
      setHovering(false);
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
    if (isFocusVisible(ownerDocument(refs.viewportRef ?? null).activeElement)) {
      setFocused(true);
      pauseTimers();
    }
  }

  function handleBlur(event: FocusEvent) {
    if (!focused() || contains(refs.viewportRef, event.relatedTarget as HTMLElement | null)) {
      return;
    }

    setFocused(false);
    resumeTimers();
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
      refs.viewportRef = el;
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
          {numToasts() > 0 && prevFocusElement() && <FocusGuard onFocus={handleFocusGuard} />}
          {componentProps.children}
          {numToasts() > 0 && prevFocusElement() && <FocusGuard onFocus={handleFocusGuard} />}
        </>
      );
    },
  });

  const contextValue = { refs };

  const highPriorityToasts = createMemo(() =>
    toasts.list.filter((toast) => toast.priority === 'high'),
  );

  return (
    <ToastViewportContext.Provider value={contextValue}>
      {numToasts() > 0 && prevFocusElement() && <FocusGuard onFocus={handleFocusGuard} />}
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
    </ToastViewportContext.Provider>
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
