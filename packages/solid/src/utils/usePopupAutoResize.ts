import { NOOP } from '@base-ui/utils/empty';
import { useAnimationFrame } from '@base-ui/utils/useAnimationFrame';
import { createEffect, createMemo, JSX, onCleanup } from 'solid-js';
import { Dimensions } from '../floating-ui-solid/types';
import { access, type MaybeAccessor } from '../solid-helpers';
import { EMPTY_OBJECT } from './constants';
import { getCssDimensions } from './getCssDimensions';
import { Side } from './useAnchorPositioning';
import { useAnimationsFinished } from './useAnimationsFinished';

const supportsResizeObserver = typeof ResizeObserver !== 'undefined';

const DEFAULT_ENABLED = () => true;

/**
 * Allows the element to automatically resize based on its content while supporting animations.
 */
export function usePopupAutoResize(parameters: UsePopupAutoResizeParameters) {
  const popupElement = () => access(parameters.popupElement);
  const positionerElement = () => access(parameters.positionerElement);
  const content = () => access(parameters.content);
  const mounted = () => access(parameters.mounted);
  const enabled = () => (parameters.enabled ? parameters.enabled() : DEFAULT_ENABLED());
  const side = () => access(parameters.side);
  const direction = () => access(parameters.direction);

  const runOnceAnimationsFinish = useAnimationsFinished(parameters.popupElement, true, false);

  const animationFrame = useAnimationFrame();

  let committedDimensionsRef = null as Dimensions | null;
  let liveDimensionsRef = null as Dimensions | null;
  let isInitialRenderRef = true;

  let restoreAnchoringStylesRef = NOOP;

  const anchoringStyles = createMemo<JSX.CSSProperties>(() => {
    // Ensure popup size transitions correctly when anchored to `bottom` (side=top) or `right` (side=left).
    let isOriginSide = side() === 'top';
    let isPhysicalLeft = side() === 'left';
    if (direction() === 'rtl') {
      isOriginSide = isOriginSide || side() === 'inline-end';
      isPhysicalLeft = isPhysicalLeft || side() === 'inline-end';
    } else {
      isOriginSide = isOriginSide || side() === 'inline-start';
      isPhysicalLeft = isPhysicalLeft || side() === 'inline-start';
    }

    return isOriginSide
      ? {
          position: 'absolute',
          [side() === 'top' ? 'bottom' : 'top']: '0',
          [isPhysicalLeft ? 'right' : 'left']: '0',
        }
      : EMPTY_OBJECT;
  });

  createEffect(() => {
    // Reset the state when the popup is closed.
    if (!mounted() || !enabled() || !supportsResizeObserver) {
      restoreAnchoringStylesRef = NOOP;
      isInitialRenderRef = true;
      committedDimensionsRef = null;
      liveDimensionsRef = null;
      return;
    }

    const popupEl = popupElement();
    const positionerEl = positionerElement();
    if (!popupEl || !positionerEl) {
      return;
    }

    restoreAnchoringStylesRef = applyElementStyles(
      popupEl,
      anchoringStyles() as Record<string, string>,
    );

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        liveDimensionsRef = {
          width: Math.ceil(entry.borderBoxSize[0].inlineSize),
          height: Math.ceil(entry.borderBoxSize[0].blockSize),
        };
      }
    });

    observer.observe(popupEl);

    // Measure the rendered size to enable transitions:
    setPopupCssSize(popupEl, 'auto');

    const restorePopupPosition = overrideElementStyle(popupEl, 'position', 'static');
    const restorePopupTransform = overrideElementStyle(popupEl, 'transform', 'none');
    const restorePopupScale = overrideElementStyle(popupEl, 'scale', '1');
    const restorePositionerAvailableSize = applyElementStyles(positionerEl, {
      '--available-width': 'max-content',
      '--available-height': 'max-content',
    });

    function restoreMeasurementOverrides() {
      restorePopupPosition();
      restorePopupTransform();
      restorePositionerAvailableSize();
    }

    function restoreMeasurementOverridesIncludingScale() {
      restoreMeasurementOverrides();
      restorePopupScale();
    }

    parameters.onMeasureLayout?.();

    // Initial render (for each time the popup opens).
    if (isInitialRenderRef || committedDimensionsRef === null) {
      setPositionerCssSize(positionerEl, 'max-content');

      const dimensions = getCssDimensions(popupEl);

      committedDimensionsRef = dimensions;

      setPositionerCssSize(positionerEl, dimensions);
      restoreMeasurementOverridesIncludingScale();
      parameters.onMeasureLayoutComplete?.(null, dimensions);

      isInitialRenderRef = false;

      return () => {
        observer.disconnect();
        restoreAnchoringStylesRef();
        restoreAnchoringStylesRef = NOOP;
      };
    }

    // Subsequent renders while open (when `content` changes).
    setPopupCssSize(popupEl, 'auto');
    setPositionerCssSize(positionerEl, 'max-content');

    const previousDimensions = committedDimensionsRef ?? liveDimensionsRef;
    const newDimensions = getCssDimensions(popupEl);

    // Commit immediately so future content changes have a stable previous size, even if
    // ResizeObserver runs after this point.
    committedDimensionsRef = newDimensions;

    if (!previousDimensions) {
      setPositionerCssSize(positionerEl, newDimensions);
      restoreMeasurementOverridesIncludingScale();
      parameters.onMeasureLayoutComplete?.(null, newDimensions);

      return () => {
        observer.disconnect();
        animationFrame.cancel();
        restoreAnchoringStylesRef();
        restoreAnchoringStylesRef = NOOP;
      };
    }

    setPopupCssSize(popupEl, previousDimensions);
    restoreMeasurementOverrides();
    parameters.onMeasureLayoutComplete?.(previousDimensions, newDimensions);

    setPositionerCssSize(positionerEl, newDimensions);

    const abortController = new AbortController();

    animationFrame.request(() => {
      setPopupCssSize(popupEl, newDimensions);

      runOnceAnimationsFinish(() => {
        popupEl.style.setProperty('--popup-width', 'auto');
        popupEl.style.setProperty('--popup-height', 'auto');
      }, abortController.signal);
    });

    onCleanup(() => {
      observer.disconnect();
      abortController.abort();
      animationFrame.cancel();
      restoreAnchoringStylesRef();
      restoreAnchoringStylesRef = NOOP;
    });
  });
}

interface UsePopupAutoResizeParameters {
  /**
   * Element to resize.
   */
  popupElement: MaybeAccessor<HTMLElement | null | undefined>;
  /*
   * Positioner element (parent of the popup)
   */
  positionerElement: MaybeAccessor<HTMLElement | null | undefined>;
  /**
   * Whether the popup is mounted.
   */
  mounted: MaybeAccessor<boolean>;
  /*
   * Content that may change and trigger a resize.
   * This doesn't have to be the actual content of the popup, but a value that triggers a resize.
   */
  content: MaybeAccessor<unknown>;
  /**
   * Whether the auto-resize is enabled. This function runs in an effect and can safely access refs.
   */
  enabled?: () => boolean;
  /**
   * Callback fired immediately before measuring the dimensions of the new content.
   */
  onMeasureLayout?: () => void;
  /**
   * Callback fired after the new dimensions have been measured.
   *
   * @param previousDimensions Dimensions before the change, or `null` if this is the first measurement.
   * @param newDimensions Newly measured dimensions.
   */
  onMeasureLayoutComplete?: (
    previousDimensions: Dimensions | null,
    newDimensions: Dimensions,
  ) => void;

  side: MaybeAccessor<Side>;
  direction: MaybeAccessor<'ltr' | 'rtl'>;
}

function overrideElementStyle(element: HTMLElement, property: string, value: string) {
  const originalValue = element.style.getPropertyValue(property);
  element.style.setProperty(property, value);

  return () => {
    element.style.setProperty(property, originalValue);
  };
}

function applyElementStyles(element: HTMLElement, styles: Record<string, string>) {
  const restorers: Array<() => void> = [];

  for (const [key, value] of Object.entries(styles)) {
    restorers.push(overrideElementStyle(element, key, value));
  }

  return restorers.length
    ? () => {
        restorers.forEach((restore) => restore());
      }
    : NOOP;
}

function setPopupCssSize(popupElement: HTMLElement, size: Dimensions | 'auto') {
  const width = size === 'auto' ? 'auto' : `${size.width}px`;
  const height = size === 'auto' ? 'auto' : `${size.height}px`;
  popupElement.style.setProperty('--popup-width', width);
  popupElement.style.setProperty('--popup-height', height);
}

function setPositionerCssSize(positionerElement: HTMLElement, size: Dimensions | 'max-content') {
  const width = size === 'max-content' ? 'max-content' : `${size.width}px`;
  const height = size === 'max-content' ? 'max-content' : `${size.height}px`;
  positionerElement.style.setProperty('--positioner-width', width);
  positionerElement.style.setProperty('--positioner-height', height);
}
