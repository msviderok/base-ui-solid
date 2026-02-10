import { createMemo, createSignal, type JSX, onMount } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { valueToPercent } from '../../utils/valueToPercent';
import type { SliderRoot } from '../root/SliderRoot';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';

function getInsetStyles(
  vertical: boolean,
  range: boolean,
  start: number | undefined,
  end: number | undefined,
  renderBeforeHydration: boolean,
  mounted: boolean,
): JSX.CSSProperties & Record<string, unknown> {
  const visibility =
    start === undefined || (range && end === undefined) ? ('hidden' as const) : undefined;

  const startEdge = vertical ? 'bottom' : 'inset-inline-start';
  const mainSide = vertical ? 'height' : 'width';
  const crossSide = vertical ? 'width' : 'height';

  const styles: JSX.CSSProperties & Record<string, unknown> = {
    visibility: renderBeforeHydration && !mounted ? 'hidden' : visibility,
    position: vertical ? 'absolute' : 'relative',
    [crossSide]: 'inherit',
  };

  styles['--start-position'] = `${start ?? 0}%`;

  if (!range) {
    styles[startEdge] = 0;
    styles[mainSide] = 'var(--start-position)';

    return styles;
  }

  styles['--relative-size'] = `${(end ?? 0) - (start ?? 0)}%`;

  styles[startEdge] = 'var(--start-position)';
  styles[mainSide] = 'var(--relative-size)';

  return styles;
}

function getCenteredStyles(
  vertical: boolean,
  range: boolean,
  start: number,
  end: number,
): JSX.CSSProperties {
  const startEdge = vertical ? 'bottom' : 'inset-inline-start';
  const mainSide = vertical ? 'height' : 'width';
  const crossSide = vertical ? 'width' : 'height';

  const styles: JSX.CSSProperties = {
    position: vertical ? 'absolute' : 'relative',
    [crossSide]: 'inherit',
  };

  if (!range) {
    styles[startEdge] = 0;
    styles[mainSide] = `${start}%`;

    return styles;
  }

  const size = end - start;

  styles[startEdge] = `${start}%`;
  styles[mainSide] = `${size}%`;

  return styles;
}

/**
 * Visualizes the current value of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderIndicator(componentProps: SliderIndicator.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { indicatorPosition, inset, max, min, orientation, renderBeforeHydration, state, values } =
    useSliderRootContext();

  const [isMounted, setIsMounted] = createSignal(false);
  onMount(() => setIsMounted(true));

  const vertical = () => orientation() === 'vertical';
  const range = () => values().length > 1;

  const style = createMemo<JSX.CSSProperties>(() => {
    return inset()
      ? getInsetStyles(
          vertical(),
          range(),
          indicatorPosition()[0],
          indicatorPosition()[1],
          renderBeforeHydration(),
          isMounted(),
        )
      : getCenteredStyles(
          vertical(),
          range(),
          valueToPercent(values()[0], min(), max()),
          valueToPercent(values()[values().length - 1], min(), max()),
        );
  });

  const element = useRenderElement('div', componentProps, {
    state,
    props: [
      {
        ['data-base-ui-slider-indicator' as string]: renderBeforeHydration() ? '' : undefined,
        get style() {
          return style();
        },
        // @ts-expect-error - suppressHydrationWarning is not a valid attribute for Solid
        suppressHydrationWarning: renderBeforeHydration() || undefined,
      },
      elementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface SliderIndicatorProps extends BaseUIComponentProps<'div', SliderRoot.State> {}

export namespace SliderIndicator {
  export type Props = SliderIndicatorProps;
}
