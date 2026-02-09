import { type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { ProgressRoot } from '../root/ProgressRoot';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
/**
 * A text label displaying the current value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressValue(componentProps: ProgressValue.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, ['children']);

  const { value, formattedValue, state } = useProgressRootContext();

  const formattedValueArg = () => (value() == null ? 'indeterminate' : formattedValue());
  const formattedValueDisplay = () => (value() == null ? null : formattedValue());

  const element = useRenderElement('span', componentProps, {
    state,
    props: [{ 'aria-hidden': true }, elementProps],
    stateAttributesMapping: progressStateAttributesMapping,
    get children() {
      return componentProps.children?.(formattedValueArg(), value()) ?? formattedValueDisplay();
    },
  });

  return <>{element()}</>;
}

export interface ProgressValueProps extends Omit<
  BaseUIComponentProps<'span', ProgressRoot.State>,
  'children'
> {
  children?: ((formattedValue: string | null, value: number | null) => JSX.Element) | null;
}

export namespace ProgressValue {
  export type Props = ProgressValueProps;
}
