import { Match, Switch, type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { resolveMultipleLabels, resolveSelectedLabel } from '../../utils/resolveValueLabel';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useSelectRootContext } from '../root/SelectRootContext';

const stateAttributesMapping: StateAttributesMapping<SelectValue.State> = {
  value: () => null,
};

/**
 * A text label of the currently selected item.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectValue(componentProps: SelectValue.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['children', 'placeholder']);

  const { store, refs } = useSelectRootContext();

  const value = store.useState('value');
  const items = store.useState('items');
  const itemToStringLabel = store.useState('itemToStringLabel');
  const hasSelectedValue = store.useState('hasSelectedValue');

  const shouldCheckNullItemLabel = () =>
    !hasSelectedValue() && local.placeholder != null && local.children == null;
  const hasNullLabel = store.useState('hasNullItemLabel', shouldCheckNullItemLabel);

  const state: SelectValue.State = {
    get value() {
      return value();
    },
    get placeholder() {
      return !hasSelectedValue();
    },
  };

  const element = useRenderElement('span', componentProps, {
    state,
    ref: (el) => {
      refs.valueRef = el;
    },
    props: elementProps as any,
    stateAttributesMapping,
    get children() {
      return (
        <Switch fallback={<>{resolveSelectedLabel(value(), items(), itemToStringLabel())}</>}>
          <Match when={typeof componentProps.children === 'function'}>
            {(componentProps.children as Function)(value())}
          </Match>
          <Match when={componentProps.children != null}>{componentProps.children}</Match>
          <Match when={!hasSelectedValue() && local.placeholder != null && !hasNullLabel()}>
            {local.placeholder}
          </Match>
          <Match when={Array.isArray(value())}>
            {resolveMultipleLabels(value(), items(), itemToStringLabel())}
          </Match>
        </Switch>
      );
    },
  });

  return <>{element()}</>;
}

export interface SelectValueState {
  /**
   * The value of the currently selected item.
   */
  value: any;
  /**
   * Whether the placeholder is being displayed.
   */
  placeholder: boolean;
}

export interface SelectValueProps extends Omit<
  BaseUIComponentProps<'span', SelectValue.State>,
  'children'
> {
  /**
   * Accepts a function that returns a `ReactNode` to format the selected value.
   * @example
   * ```tsx
   * <Select.Value>
   *   {(value: string | null) => value ? labels[value] : 'No value'}
   * </Select.Value>
   * ```
   */
  children?: JSX.Element | ((value: any) => JSX.Element);
  /**
   * The placeholder value to display when no value is selected.
   * This is overridden by `children` if specified, or by a null item's label in `items`.
   */
  placeholder?: JSX.Element;
}

export namespace SelectValue {
  export type State = SelectValueState;
  export type Props = SelectValueProps;
}
