import { type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { MeterRoot } from '../root/MeterRoot';
import { useMeterRootContext } from '../root/MeterRootContext';

/**
 * A text element displaying the current value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterValue(componentProps: MeterValue.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, ['children']);

  const { value, formattedValue } = useMeterRootContext();

  const element = useRenderElement('span', componentProps, {
    props: [{ 'aria-hidden': true }, elementProps],
    get children() {
      return (
        <>
          {typeof componentProps.children === 'function'
            ? componentProps.children(formattedValue(), value())
            : ((formattedValue() || value()) ?? '')}
        </>
      );
    },
  });

  return <>{element()}</>;
}

export interface MeterValueProps extends Omit<
  BaseUIComponentProps<'span', MeterRoot.State>,
  'children'
> {
  children?: null | ((formattedValue: string, value: number) => JSX.Element);
}

export namespace MeterValue {
  export type Props = MeterValueProps;
}
