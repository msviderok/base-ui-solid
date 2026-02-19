import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  on,
  onCleanup,
  type JSX,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { access, type MaybeAccessor } from '../../solid-helpers';
import { CompositeListContext } from './CompositeListContext';

type NodeId = string;
export type CompositeMetadata<CustomMetadata> = {
  index?: (number | null) | undefined;
} & CustomMetadata;

/**
 * Provides context for a list of items in a composite component.
 * @internal
 */
export function CompositeList<Metadata>(props: CompositeList.Props<Metadata>) {
  const listeners: Function[] = [];
  const nodeIds = new Map<Element, NodeId>();
  const [nextIndex, setNextIndex] = createSignal(0);
  const [nodes, setNodes] = createStore<Record<NodeId, { element: Element; metadata: Metadata }>>(
    {},
  );

  // Filter out disconnected elements before sorting to avoid inconsistent
  // compareDocumentPosition results when elements are detached from the DOM.
  const nodesAsArray = createMemo(() => {
    return Object.values(nodes)
      .filter((node) => node.element.isConnected)
      .sort((a, b) => sortByDocumentPosition(a.element, b.element))
      .map((node, index) => ({
        element: node.element,
        metadata: { index, ...node.metadata },
      }));
  });

  const sortedMap = createMemo(() => {
    const newMap = new Map<Element, CompositeMetadata<Metadata>>();
    nodesAsArray().forEach((node) => newMap.set(node.element, node.metadata));
    return newMap;
  });

  function register(node: Element, metadata: MaybeAccessor<Metadata>) {
    const uid = nodeIds?.get(node) ?? createUniqueId();
    nodeIds.set(node, uid);
    setNodes(
      produce((prevNodes) => {
        prevNodes[uid] = {
          element: node,
          metadata: { ...(prevNodes[uid]?.metadata ?? {}), ...access(metadata) },
        };
      }),
    );
  }

  function unregister(node: Element) {
    const uid = nodeIds.get(node);
    if (uid) {
      nodeIds.delete(node);
      setNodes(
        produce((prevNodes) => {
          delete prevNodes[uid];
        }),
      );
    }
  }

  function subscribeMapChange(fn: (map: Map<Element, CompositeMetadata<Metadata> | null>) => void) {
    if (listeners.includes(fn) === false) {
      listeners.push(fn);
    }
  }

  function unsubscribeMapChange(
    fn: (map: Map<Element, CompositeMetadata<Metadata> | null>) => void,
  ) {
    const index = listeners.indexOf(fn);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  createEffect(() => {
    if (typeof MutationObserver !== 'function' || sortedMap().size === 0) {
      return;
    }

    const mutationObserver = new MutationObserver((entries) => {
      const diff = new Set<Node>();
      const updateDiff = (node: Node) => (diff.has(node) ? diff.delete(node) : diff.add(node));
      entries.forEach((entry) => {
        entry.removedNodes.forEach(updateDiff);
        entry.addedNodes.forEach(updateDiff);
      });
    });

    sortedMap().forEach((_, node) => {
      if (node.parentElement) {
        mutationObserver.observe(node.parentElement, { childList: true });
      }
    });

    onCleanup(() => {
      mutationObserver.disconnect();
    });
  });

  createEffect(
    on(nodesAsArray, (newArray) => {
      if (props.refs.elements.length !== newArray.length) {
        props.refs.elements.length = newArray.length;
      }
      if (props.refs.labels && props.refs.labels.length !== newArray.length) {
        props.refs.labels.length = newArray.length;
      }
      props.onMapChange?.(newArray);
    }),
  );

  createEffect(on(sortedMap, (sorted) => listeners.forEach((l) => l(sorted))));

  onCleanup(() => {
    props.refs.elements = [];
    if (props.refs.labels) {
      props.refs.labels = [];
    }
  });

  return (
    <CompositeListContext.Provider
      value={{
        register,
        unregister,
        subscribeMapChange,
        unsubscribeMapChange,
        // eslint-disable-next-line solid/reactivity
        refs: props.refs,
        nextIndex,
        setNextIndex,
      }}
    >
      {props.children}
    </CompositeListContext.Provider>
  );
}

function sortByDocumentPosition(a: Element, b: Element) {
  const position = a.compareDocumentPosition(b);

  if (
    position & Node.DOCUMENT_POSITION_FOLLOWING ||
    position & Node.DOCUMENT_POSITION_CONTAINED_BY
  ) {
    return -1;
  }

  if (position & Node.DOCUMENT_POSITION_PRECEDING || position & Node.DOCUMENT_POSITION_CONTAINS) {
    return 1;
  }

  return 0;
}

export interface CompositeListProps<Metadata> {
  children: JSX.Element;
  /**
   * A ref to the list of HTML elements, ordered by their index.
   * `useListNavigation`'s `listRef` prop.
   */
  refs: {
    /**
     * A ref to the list of HTML elements, ordered by their index.
     * `useListNavigation`'s `listRef` prop.
     */
    elements: Array<HTMLElement | null | undefined>;
    /**
     * A ref to the list of element labels, ordered by their index.
     * `useTypeahead`'s `listRef` prop.
     */
    labels?: Array<string | null> | undefined;
  };
  onMapChange?:
    | ((newMap: Array<{ element: Element; metadata: CompositeMetadata<Metadata> | null }>) => void)
    | undefined;
}

export namespace CompositeList {
  export type Props<Metadata> = CompositeListProps<Metadata>;
}
