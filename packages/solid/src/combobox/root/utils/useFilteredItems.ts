import { type Accessor } from 'solid-js';
import { useComboboxDerivedItemsContext } from '../ComboboxRootContext';

/**
 * Returns the internally filtered items.
 */
export function useFilteredItems<T>() {
  const items = useComboboxDerivedItemsContext();
  return items.filteredItems as Accessor<T[]>;
}
