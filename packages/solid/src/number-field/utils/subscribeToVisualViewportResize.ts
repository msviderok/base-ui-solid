import { onCleanup } from 'solid-js';
import { ownerWindow } from '../../utils/owner';

// This lets us invert the scale of the cursor to match the OS scale, in which the cursor doesn't
// scale with the content on pinch-zoom.
export function subscribeToVisualViewportResize(
  element: Element,
  visualScaleRef: { current: number },
) {
  const vV = ownerWindow(element).visualViewport;

  if (!vV) {
    return;
  }

  function handleVisualResize() {
    if (vV) {
      visualScaleRef.current = vV.scale;
    }
  }

  handleVisualResize();

  vV.addEventListener('resize', handleVisualResize);

  onCleanup(() => {
    vV.removeEventListener('resize', handleVisualResize);
  });
}
