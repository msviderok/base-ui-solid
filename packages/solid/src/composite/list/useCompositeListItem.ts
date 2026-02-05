import { createEffect, createSignal, onCleanup, type Accessor } from 'solid-js';
import { access, type MaybeAccessor } from '../../solid-helpers';
import type { CompositeMetadata } from './CompositeList';
import { useCompositeListContext } from './CompositeListContext';

export interface UseCompositeListItemParameters<Metadata> {
  index?: MaybeAccessor<number | undefined>;
  label?: MaybeAccessor<string | null | undefined>;
  metadata?: MaybeAccessor<Metadata | undefined | null>;
  textRef?: MaybeAccessor<HTMLElement | null | undefined>;
  /** Enables guessing the indexes. This avoids a re-render after mount, which is useful for
   * large lists. This should be used for lists that are likely flat and vertical, other cases
   * might trigger a re-render anyway. */
  indexGuessBehavior?: IndexGuessBehavior;
}

interface UseCompositeListItemReturnValue {
  setRef: (node: HTMLElement | null | undefined) => void;
  index: Accessor<number>;
}

export enum IndexGuessBehavior {
  None,
  GuessFromOrder,
}

function initialIndex(
  indexRef: number,
  nextIndex: number,
  setNextIndex: (nextIndex: number) => void,
) {
  if (indexRef === -1) {
    const newIndex = nextIndex;
    setNextIndex(nextIndex + 1);
    indexRef = newIndex;
  }
  return indexRef;
}

/**
 * Used to register a list item and its index (DOM position) in the `CompositeList`.
 */
export function useCompositeListItem<Metadata>(
  params: UseCompositeListItemParameters<Metadata> = {},
): UseCompositeListItemReturnValue {
  const externalIndex = () => access(params.index);
  const context = useCompositeListContext();
  const indexRef = -1;
  const [index, setIndex] = createSignal<number>(
    (externalIndex() ?? params.indexGuessBehavior === IndexGuessBehavior.GuessFromOrder)
      ? initialIndex(indexRef, context.nextIndex(), context.setNextIndex)
      : -1,
  );

  const [componentRef, setComponentRef] = createSignal<Element | null | undefined>();

  function onMapChange(map: Map<Element, CompositeMetadata<Metadata> | null>) {
    const itemRef = componentRef();
    const i = itemRef ? map.get(itemRef)?.index : null;

    if (i != null) {
      setIndex(i);

      if (i !== -1 && itemRef) {
        context.refs.elements[i] = itemRef as HTMLElement;

        if (context.refs.labels) {
          const textRef = access(params.textRef);
          const label = access(params.label);
          const isLabelDefined = label !== undefined;
          context.refs.labels[i] = isLabelDefined
            ? label
            : (textRef?.textContent ?? itemRef.textContent);
        }
      }
    }
  }

  createEffect(() => {
    if (externalIndex() != null) {
      return;
    }

    const node = componentRef();
    if (node) {
      context.register(node, params.metadata);
      context.subscribeMapChange(onMapChange);
    }

    onCleanup(() => {
      if (node) {
        context.unregister(node);
        context.unsubscribeMapChange(onMapChange);
      }
    });
  });

  return {
    index,
    setRef: setComponentRef,
  };
}
