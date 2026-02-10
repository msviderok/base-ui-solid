import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { SliderRoot } from '../root/SliderRoot';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';

/**
 * Contains the slider indicator and represents the entire range of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderTrack(componentProps: SliderTrack.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { state } = useSliderRootContext();

  const element = useRenderElement('div', componentProps, {
    state,
    props: [{ style: { position: 'relative' } }, elementProps],
    stateAttributesMapping: sliderStateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface SliderTrackProps extends BaseUIComponentProps<'div', SliderRoot.State> {}

export namespace SliderTrack {
  export type Props = SliderTrackProps;
}
