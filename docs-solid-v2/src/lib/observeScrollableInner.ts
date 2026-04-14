export function observeScrollableInner(ref: HTMLElement | null) {
  if (!ref) {
    return undefined;
  }

  const inner = ref.children[0] as HTMLElement | undefined;
  let raf: number | null = null;
  const observer = new ResizeObserver(() => {
    if (!inner) {
      return;
    }

    const isScrollable = inner.scrollWidth > inner.offsetWidth;
    raf = requestAnimationFrame(() => {
      if (isScrollable) {
        ref.setAttribute('data-scrollable', '');
      } else {
        ref.removeAttribute('data-scrollable');
      }

      raf = null;
    });
  });

  if (inner) {
    observer.observe(inner);
  } else if (import.meta.env.DEV) {
    console.warn('Expected to find an inner element');
  }

  return () => {
    observer.disconnect();
    if (raf !== null) {
      cancelAnimationFrame(raf);
    }
  };
}
