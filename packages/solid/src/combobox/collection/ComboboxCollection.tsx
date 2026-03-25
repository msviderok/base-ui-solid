import { createMemo, For, Show, type Accessor, type JSX } from 'solid-js';
import { useComboboxDerivedItemsContext } from '../root/ComboboxRootContext';
import { useGroupCollectionContext } from './GroupCollectionContext';

/**
 * Renders filtered list items.
 * Doesn't render its own HTML element.
 *
 * If rendering a flat list, pass a function child to the `List` component instead, which implicitly wraps it.
 */
export function ComboboxCollection(props: ComboboxCollection.Props) {
  const { filteredItems } = useComboboxDerivedItemsContext();
  const groupContext = useGroupCollectionContext();

  const itemsToRender = createMemo(() => (groupContext ? groupContext.items() : filteredItems()));

  return (
    <Show keyed when={itemsToRender()}>
      {(items) => <For each={items}>{props.children}</For>}
    </Show>
  );
}

export interface ComboboxCollectionProps {
  children: (item: any, index: Accessor<number>) => JSX.Element;
}

export namespace ComboboxCollection {
  export type Props = ComboboxCollectionProps;
}
