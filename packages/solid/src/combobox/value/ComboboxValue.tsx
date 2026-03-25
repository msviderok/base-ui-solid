import { children, createMemo, Match, Switch, type Accessor, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { childrenLazy } from '../../solid-helpers';
import { resolveMultipleLabels, resolveSelectedLabel } from '../../utils/resolveValueLabel';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/**
 * The current value of the combobox.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxValue(props: ComboboxValue.Props) {
  const { store } = useComboboxRootContext();

  const selectedValue = store.useSelector('selectedValue');
  const items = store.useSelector('items');
  const multiple = createMemo(() => store.selectors.selectionMode() === 'multiple');
  const hasSelectedValue = store.useSelector('hasSelectedValue');

  const shouldCheckNullItemLabel = () =>
    !hasSelectedValue() && props.placeholder != null && props.children == null;
  const hasNullLabel = () => store.selectors.hasNullItemLabel(shouldCheckNullItemLabel);

  return (
    <Switch
      fallback={resolveSelectedLabel(selectedValue(), items(), store.context.itemToStringLabel)}
    >
      <Match keyed when={typeof props.children === 'function' && props.children}>
        {(renderer) => renderer(selectedValue)}
      </Match>
      <Match when={props.children != null}>{props.children}</Match>
      <Match when={!hasSelectedValue() && props.placeholder != null && !hasNullLabel()}>
        {props.placeholder}
      </Match>
      <Match when={multiple() && Array.isArray(selectedValue())}>
        {resolveMultipleLabels(selectedValue(), items(), store.context.itemToStringLabel)}
      </Match>
    </Switch>
  );
}

export interface ComboboxValueState {}

export interface ComboboxValueProps {
  children?: JSX.Element | ((selectedValue: Accessor<any>) => JSX.Element);
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
