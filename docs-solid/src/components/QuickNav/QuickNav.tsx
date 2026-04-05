import { callEventHandler } from '@msviderok/base-ui-solid/solid-helpers';
import { useLocation } from '@solidjs/router';
import clsx from 'clsx';
import { useGoogleAnalytics } from 'docs/src/blocks/GoogleAnalyticsProvider';
import { createMemo, onCleanup, onMount, splitProps, type ComponentProps } from 'solid-js';

export function Container(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <div class={clsx('QuickNavContainer', local.class)} {...rest} />;
}

export function Root(props: ComponentProps<'nav'>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  let ref: HTMLElement | undefined;

  onMount(() => {
    onMounted(ref);
  });

  return (
    <nav aria-label="On this page" ref={ref} class={clsx('QuickNavRoot', local.class)} {...rest}>
      <div class="QuickNavInner">{local.children}</div>
    </nav>
  );
}

// When nav height is larger than viewport, we make document scroll push it around
// so it sticks to top or bottom depending on scroll direction as if it was a real
// physical object constrained by the viewport.
function onMounted(ref: HTMLElement | undefined) {
  if (!ref) {
    return undefined;
  }

  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  /** How much of the nav should be cut off at the bottom to stop using the default sticky top position */
  const stickyTopThreshold = 2.25 * rem;

  let top: number;
  let bottom: number;
  let prevScrollY = window.scrollY;
  let resizeObserver: ResizeObserver | undefined;
  let state: 'Scrollable' | 'StickyTop' | 'StickyBottom' = 'StickyTop';
  let raf = 0;

  const cssTop = parseFloat(getComputedStyle(ref).top);

  let cachedPositions: {
    staticTop: number;
    absoluteTop: number;
    absoluteBottom: number;
  } | null = null;

  function getCachedPositions() {
    if (cachedPositions === null) {
      cachedPositions = getNaturalPositions();
    }

    return cachedPositions;
  }

  function getNaturalPositions() {
    if (!ref) {
      return { absoluteTop: 0, staticTop: 0, absoluteBottom: 0 };
    }

    const initialStyles = {
      top: ref.style.top,
      bottom: ref.style.bottom,
      marginTop: ref.style.marginTop,
      marginBottom: ref.style.marginBottom,
    };

    ref.style.top = '0px';
    ref.style.bottom = '';
    ref.style.marginTop = '';
    ref.style.marginBottom = '';

    // Get the nav top Y coordinate from the start of the document
    // if it was `position: static` and `position: absolute`
    // relative to the start of the document
    ref.style.position = 'static';
    const staticTop = window.scrollY + Math.round(ref.getBoundingClientRect().y);
    ref.style.marginTop = '0px';
    ref.style.position = 'absolute';
    const absoluteTop = window.scrollY + Math.round(ref.getBoundingClientRect().y);

    // Get the nav bottom Y coordinate when it's at its maximum possible bottom position
    // relative to the start of the document
    ref.style.position = 'absolute';
    ref.style.top = 'auto';
    ref.style.bottom = '0';
    const rect = ref.getBoundingClientRect();
    const absoluteBottom = window.scrollY + Math.round(rect.bottom);

    ref.style.position = '';
    ref.style.top = initialStyles.top;
    ref.style.bottom = initialStyles.bottom;
    ref.style.marginTop = initialStyles.marginTop;
    ref.style.marginBottom = initialStyles.marginBottom;
    // Remove the style attibute if it's empty so that the DOM is tidy
    if (ref?.style.length === 0) {
      ref.removeAttribute('style');
    }

    return { absoluteTop, staticTop, absoluteBottom };
  }

  function setHeightProperty() {
    if (!resizeObserver && ref) {
      resizeObserver = new ResizeObserver(([entry]) => {
        const [{ blockSize }] = entry.borderBoxSize;
        ref?.style.setProperty('--height', `${blockSize}px`);
      });
      resizeObserver.observe(ref);
    }
  }

  function stickToTop() {
    if (ref) {
      state = 'StickyTop';
      ref.style.top = '';
      ref.style.bottom = '';
      ref.style.marginTop = '';
      ref.style.marginBottom = '';
    }
  }

  function stickToBottom() {
    if (ref) {
      state = 'StickyBottom';
      setHeightProperty();
      ref.style.top = `min(var(--top), 100dvh - var(--height))`;
      ref.style.bottom = '';
      ref.style.marginTop = '';
      ref.style.marginBottom = '';
    }
  }

  function unstick(newTop: number, newBottom: number) {
    if (ref) {
      state = 'Scrollable';
      const { absoluteTop, absoluteBottom, staticTop } = getCachedPositions();
      const marginTop = Math.max(staticTop - absoluteTop, window.scrollY + newTop - absoluteTop);
      const marginBottom = Math.max(0, absoluteBottom - window.scrollY - newBottom);

      // Choose the smaller margin because at document edges,
      // the larger one may push the nav out of the container edges
      if (marginTop < marginBottom) {
        ref.style.top = 'auto';
        ref.style.bottom = '0';
        ref.style.marginTop = marginTop ? `${marginTop}px` : '';
        ref.style.marginBottom = '';
      } else {
        ref.style.top = '';
        ref.style.bottom = '';
        ref.style.marginTop = '';
        ref.style.marginBottom = marginBottom ? `${marginBottom}px` : '';
      }
    }
  }

  function handleUpdate() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const isScrollLocked = document.documentElement.hasAttribute('data-base-ui-scroll-locked');

      if (!ref || isScrollLocked) {
        return;
      }
      const delta = window.scrollY - prevScrollY;
      prevScrollY = window.scrollY;

      const rect = ref.getBoundingClientRect();
      top = rect.top;
      bottom = rect.bottom;

      // Skip when scrolling in the direction that matches the sticky position
      if ((delta > 0 && state === 'StickyBottom') || (delta < 0 && state === 'StickyTop')) {
        return;
      }

      // Should be top-sticky if the entire nav can fit in the viewport
      if (rect.height + cssTop <= window.innerHeight) {
        if (state !== 'StickyTop') {
          stickToTop();
        }
        return;
      }

      if (state === 'StickyTop') {
        const clippedAtBottom = bottom - window.innerHeight;

        if (clippedAtBottom - top > stickyTopThreshold) {
          if (delta >= clippedAtBottom) {
            stickToBottom();
            // Unstick if we are scrolling down (and not recovering from overscroll)
          } else if (delta > 0 && !isOverscrolling()) {
            unstick(Math.round(top) - delta, Math.round(bottom) - delta);
          }
        }
        return;
      }

      if (state === 'StickyBottom') {
        if (delta <= top) {
          stickToTop();
          // Unstick if we are scrolling up (and not recovering from overscroll)
        } else if (delta < 0 && !isOverscrolling()) {
          unstick(Math.round(top) - delta, Math.round(bottom) - delta);
        }
        return;
      }

      if (state === 'Scrollable' && delta < 0 && top - delta >= cssTop) {
        stickToTop();
        return;
      }

      if (state === 'Scrollable' && delta >= 0 && bottom - delta <= window.innerHeight) {
        stickToBottom();
      }
    });
  }
  const requestIdleCallback = window.requestIdleCallback ?? setTimeout;
  const cancelIdleCallback = window.cancelIdleCallback ?? clearTimeout;

  let callbackId = 0;
  function handleResize() {
    cancelIdleCallback(callbackId);
    callbackId = requestIdleCallback(() => {
      cachedPositions = getNaturalPositions();
      handleUpdate();
    });
  }

  // Maintain nav position as much as possible to avoid layout shifts
  let hash = window.location.hash;
  let pathname = window.location.pathname;
  function handlePopState() {
    if (hash !== window.location.hash && pathname === window.location.pathname) {
      window.removeEventListener('scroll', handleUpdate);

      requestAnimationFrame(() => {
        if (state === 'Scrollable') {
          unstick(Math.min(cssTop, top), Math.max(window.innerHeight, bottom));
        }

        prevScrollY = window.scrollY;
        window.addEventListener('scroll', handleUpdate);
      });
    }
    hash = window.location.hash;
    pathname = window.location.pathname;
  }

  requestIdleCallback(getCachedPositions);
  requestIdleCallback(handleUpdate);
  window.addEventListener('scroll', handleUpdate);
  window.addEventListener('resize', handleResize);
  window.addEventListener('popstate', handlePopState);

  onCleanup(() => {
    resizeObserver?.disconnect();
    window.removeEventListener('scroll', handleUpdate);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('popstate', handlePopState);
  });
}

function isOverscrolling() {
  return (
    window.scrollY < 0 ||
    window.scrollY + window.innerHeight > document.documentElement.scrollHeight
  );
}

export function Title(props: ComponentProps<'header'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <header class={clsx('QuickNavTitle', local.class)} {...rest} />;
}

export function List(props: ComponentProps<'ul'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <ul class={clsx('QuickNavList', local.class)} {...rest} />;
}

export function Item(props: ComponentProps<'li'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <li class={clsx('QuickNavItem', local.class)} {...rest} />;
}

export function Link(props: ComponentProps<'a'>) {
  const [local, rest] = splitProps(props, ['class', 'onClick']);
  const ga = useGoogleAnalytics();
  const location = useLocation();
  const pathname = createMemo(() => location.pathname);

  return (
    <a
      class={clsx('QuickNavLink', local.class)}
      {...rest}
      onClick={(event) => {
        const slug = props.href ?? undefined;
        const tocId = slug ? `${pathname()}${slug}` : pathname();
        ga?.trackEvent({
          category: 'table_of_contents',
          action: 'click',
          label: tocId,
          params: { click: tocId, slug: slug || '' },
        });
        callEventHandler(local.onClick, event);
      }}
    />
  );
}
