import { Match, Switch, type JSX } from 'solid-js';
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
      <Match when={typeof props.children === 'function' && props.children}>
        {(children) => children()(String(inputValue()))}
      </Match>
      <Match when={props.children != null}>{props.children as JSX.Element}</Match>
    </Switch>
  );
}

export interface AutocompleteValueState {}

export interface AutocompleteValueProps {
  children?: JSX.Element | ((value: string) => JSX.Element);
}

export namespace AutocompleteValue {
  export type State = AutocompleteValueState;
  export type Props = AutocompleteValueProps;
}
