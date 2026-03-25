import { Match, Switch, type Accessor, type ComponentProps, type JSX } from 'solid-js';
import { useComboboxInputValueContext } from '../../combobox/root/ComboboxRootContext';

/**
 * The current value of the autocomplete.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Autocomplete](https://base-ui.com/react/components/autocomplete)
 */
export function AutocompleteValue(props: AutocompleteValue.Props) {
  const inputValue = useComboboxInputValueContext();

  return (
    <Switch fallback={<>{inputValue()}</>}>
      <Match keyed when={typeof props.children === 'function' && props.children}>
        {(renderer) => renderer(inputValue)}
      </Match>
      <Match when={props.children != null}>{props.children as JSX.Element}</Match>
    </Switch>
  );
}

export interface AutocompleteValueState {}

export interface AutocompleteValueProps {
  children?: JSX.Element | ((value: Accessor<ComponentProps<'input'>['value']>) => JSX.Element);
}

export namespace AutocompleteValue {
  export type State = AutocompleteValueState;
  export type Props = AutocompleteValueProps;
}
