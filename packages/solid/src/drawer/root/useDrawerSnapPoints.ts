import { ownerDocument } from '@base-ui/utils/owner';
import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js';
import { useDialogRootContext } from '../../dialog/root/DialogRootContext';
import { clamp } from '../../utils/clamp';
import { type DrawerSnapPoint, useDrawerRootContext } from './DrawerRootContext';

export interface ResolvedDrawerSnapPoint {
  value: DrawerSnapPoint;
  height: number;
  offset: number;
}

function resolveSnapPointValue(
  snapPoint: DrawerSnapPoint,
  viewportHeight: number,
  rootFontSize: number,
) {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return null;
  }

  if (typeof snapPoint === 'number') {
    if (!Number.isFinite(snapPoint)) {
      return null;
    }

    if (snapPoint <= 1) {
      return clamp(snapPoint, 0, 1) * viewportHeight;
    }

    return snapPoint;
  }

  const trimmed = snapPoint.trim();

  if (trimmed.endsWith('px')) {
    const value = Number.parseFloat(trimmed);
    return Number.isFinite(value) ? value : null;
  }

  if (trimmed.endsWith('rem')) {
    const value = Number.parseFloat(trimmed);
    return Number.isFinite(value) ? value * rootFontSize : null;
  }

  return null;
}

function findClosestSnapPoint(
  height: number,
  points: ResolvedDrawerSnapPoint[],
): ResolvedDrawerSnapPoint | null {
  let closest: ResolvedDrawerSnapPoint | null = null;
  let closestDistance = Infinity;

  for (const point of points) {
    const distance = Math.abs(point.height - height);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = point;
    }
  }

  return closest;
}

export function useDrawerSnapPoints() {
  const { store } = useDialogRootContext();
  const { snapPoints, activeSnapPoint, setActiveSnapPoint, popupHeight } = useDrawerRootContext();
  const viewportElement = store.useState('viewportElement');

  const [viewportHeight, setViewportHeight] = createSignal(0);
  const [rootFontSize, setRootFontSize] = createSignal(16);

  const measureViewportHeight = () => {
    const viewport = viewportElement() ?? null;
    const doc = ownerDocument(viewport);
    const html = doc.documentElement;

    if (viewport) {
      setViewportHeight(viewport.offsetHeight);
    }

    if (!viewport) {
      setViewportHeight(html.clientHeight);
    }

    const fontSize = parseFloat(getComputedStyle(html).fontSize);
    if (Number.isFinite(fontSize)) {
      setRootFontSize(fontSize);
    }
  };

  createEffect(() => {
    measureViewportHeight();

    const viewport = viewportElement();
    if (!viewport || typeof ResizeObserver !== 'function') {
      return;
    }

    const resizeObserver = new ResizeObserver(measureViewportHeight);
    resizeObserver.observe(viewport);
    onCleanup(() => {
      resizeObserver.disconnect();
    });
  });

  const resolvedSnapPoints = createMemo<ResolvedDrawerSnapPoint[]>(() => {
    const viewportH = viewportHeight();
    const snap = snapPoints?.();
    const popupH = popupHeight();
    if (!snap || snap.length === 0 || viewportH <= 0 || popupH <= 0) {
      return [];
    }

    const maxHeight = Math.min(popupH, viewportH);
    if (!Number.isFinite(maxHeight) || maxHeight <= 0) {
      return [];
    }

    const resolved = snap
      .map((value): ResolvedDrawerSnapPoint | null => {
        const resolvedHeight = resolveSnapPointValue(value, viewportH, rootFontSize());
        if (resolvedHeight === null || !Number.isFinite(resolvedHeight)) {
          return null;
        }

        const clampedHeight = clamp(resolvedHeight, 0, maxHeight);
        return {
          value,
          height: clampedHeight,
          offset: Math.max(0, popupH - clampedHeight),
        };
      })
      .filter((point): point is ResolvedDrawerSnapPoint => Boolean(point));

    if (resolved.length <= 1) {
      return resolved;
    }

    const deduped: ResolvedDrawerSnapPoint[] = [];
    const seenHeights: number[] = [];

    for (let index = resolved.length - 1; index >= 0; index -= 1) {
      const point = resolved[index];
      const isDuplicate = seenHeights.some((height) => Math.abs(height - point.height) <= 1);
      if (isDuplicate) {
        continue;
      }

      seenHeights.push(point.height);
      deduped.push(point);
    }

    deduped.reverse();
    return deduped;
  });

  const resolvedActiveSnapPoint = createMemo(() => {
    const points = resolvedSnapPoints();
    const activeSnap = activeSnapPoint?.();
    if (activeSnap === undefined) {
      return points[0];
    }

    if (activeSnap === null) {
      return undefined;
    }

    const exactMatch = points.find((point) => Object.is(point.value, activeSnap));
    if (exactMatch) {
      return exactMatch;
    }

    const viewportH = viewportHeight();
    const maxHeight = Math.min(popupHeight(), viewportH);
    const resolvedHeight = resolveSnapPointValue(activeSnap, viewportH, rootFontSize());
    if (resolvedHeight === null || !Number.isFinite(resolvedHeight)) {
      return undefined;
    }

    const clampedHeight = clamp(resolvedHeight, 0, maxHeight);
    return findClosestSnapPoint(clampedHeight, points) ?? undefined;
  });

  return {
    snapPoints,
    activeSnapPoint,
    setActiveSnapPoint,
    popupHeight,
    viewportHeight,
    resolvedSnapPoints,
    activeSnapPointOffset: () => resolvedActiveSnapPoint()?.offset ?? null,
  };
}
