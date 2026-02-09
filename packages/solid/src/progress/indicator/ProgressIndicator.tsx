import { type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { valueToPercent } from '../../utils/valueToPercent';
import type { ProgressRoot } from '../root/ProgressRoot';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';

/**
 * Visualizes the completion status of the task.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressIndicator(componentProps: ProgressIndicator.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { max, min, value, state } = useProgressRootContext();

  const percentageValue = () =>
    Number.isFinite(value()) && value() !== null ? valueToPercent(value()!, min(), max()) : null;

  const element = useRenderElement('div', componentProps, {
    state,
    props: [
      {
        get style(): JSX.CSSProperties {
          if (percentageValue() == null) {
            return {};
          }

          return {
            'inset-inline-start': 0,
            height: 'inherit',
            width: `${percentageValue()}%`,
          };
        },
      },
      elementProps,
    ],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface ProgressIndicatorProps extends BaseUIComponentProps<'div', ProgressRoot.State> {}

export namespace ProgressIndicator {
  export type Props = ProgressIndicatorProps;
}
