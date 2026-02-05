import { createSignal } from 'solid-js';
import type { HTMLProps } from '../../utils/types';
import {
  useCompositeListItem,
  type UseCompositeListItemParameters,
} from '../list/useCompositeListItem';
import { useCompositeRootContext } from '../root/CompositeRootContext';

export interface UseCompositeItemParameters<Metadata> extends Pick<
  UseCompositeListItemParameters<Metadata>,
  'metadata' | 'indexGuessBehavior'
> {}

export function useCompositeItem<Metadata>(params: UseCompositeItemParameters<Metadata>) {
  const context = useCompositeRootContext();
  const listItem = useCompositeListItem(params);
  const isHighlighted = () => context.highlightedIndex() === listItem.index();
  const [itemRef, setItemRef] = createSignal<HTMLElement | null | undefined>(null);

  const compositeProps: HTMLProps = {
    get tabIndex() {
      return isHighlighted() ? 0 : -1;
    },
    onFocus() {
      context.onHighlightedIndexChange(listItem.index());
    },
    onMouseMove() {
      if (!context.highlightItemOnHover() || !itemRef()) {
        return;
      }

      const disabled = itemRef()?.hasAttribute('disabled') || itemRef()?.ariaDisabled === 'true';
      if (!isHighlighted() && !disabled) {
        itemRef()?.focus();
      }
    },
  };

  return {
    compositeProps,
    index: listItem.index,
    setCompositeRef: (el: HTMLElement | null | undefined) => {
      setItemRef(el);
      listItem.setRef(el);
    },
  };
}
