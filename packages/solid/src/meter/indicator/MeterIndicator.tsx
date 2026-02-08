import type { JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { valueToPercent } from '../../utils/valueToPercent';
import type { MeterRoot } from '../root/MeterRoot';
import { useMeterRootContext } from '../root/MeterRootContext';

/**
 * Visualizes the position of the value along the range.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterIndicator(componentProps: MeterIndicator.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const context = useMeterRootContext();

  const percentageWidth = () => valueToPercent(context.value(), context.min(), context.max());

  const element = useRenderElement('div', componentProps, {
    props: [
      {
        get style(): JSX.CSSProperties {
          return {
            'inset-inline-start': 0,
            height: 'inherit',
            width: `${percentageWidth()}%`,
          };
        },
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface MeterIndicatorProps extends BaseUIComponentProps<'div', MeterRoot.State> {}

export namespace MeterIndicator {
  export type Props = MeterIndicatorProps;
}
