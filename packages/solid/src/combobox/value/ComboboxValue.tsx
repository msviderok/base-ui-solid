import { Match, Switch, type JSX } from 'solid-js';
import { resolveMultipleLabels, resolveSelectedLabel } from '../../utils/resolveValueLabel';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/**
 * The current value of the combobox.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxValue(props: ComboboxValue.Props) {
  const store = useComboboxRootContext();

  const itemToStringLabel = store.useState('itemToStringLabel');
  const selectedValue = store.useState('selectedValue');
  const items = store.useState('items');
  const multiple = () => store.useState('selectionMode')() === 'multiple';
  const hasSelectedValue = store.useState('hasSelectedValue');

  return (
    <Switch fallback={resolveSelectedLabel(selectedValue(), items(), itemToStringLabel())}>
      <Match when={typeof props.children === 'function'}>
        {(props.children as Function)(selectedValue())}
      </Match>
      <Match when={props.children != null}>{props.children}</Match>
      <Match
        when={
          !hasSelectedValue() &&
          props.placeholder != null &&
          !store.useState(
            'hasNullItemLabel',
            () => !hasSelectedValue() && props.placeholder != null && props.children == null,
          )
        }
      >
        {props.placeholder}
      </Match>
      <Match when={multiple() && Array.isArray(selectedValue())}>
        {resolveMultipleLabels(selectedValue(), items(), itemToStringLabel())}
      </Match>
    </Switch>
  );
}

export interface ComboboxValueState {}

export interface ComboboxValueProps {
  children?: JSX.Element | ((selectedValue: any) => JSX.Element);
  /**
   * The placeholder value to display when no value is selected.
   * This is overridden by `children` if specified, or by a null item's label in `items`.
   */
  placeholder?: JSX.Element;
}

export namespace ComboboxValue {
  export type State = ComboboxValueState;
  export type Props = ComboboxValueProps;
}
