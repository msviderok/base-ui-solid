import {
  createContext,
  createRenderEffect,
  onCleanup,
  useContext,
  type Accessor,
  type JSX,
} from 'solid-js';
import { access } from '../../solid-helpers';
import { useId } from '../../utils/useId';
import type { FloatingContext, FloatingTreeType } from '../types';
import { FloatingTreeStore } from './FloatingTreeStore';

const FloatingNodeContext = createContext<{
  id: Accessor<string | undefined>;
  parentId: Accessor<string | null>;
  context?: FloatingContext;
} | null>(null);
const FloatingTreeContext = createContext<FloatingTreeType | null>(null);

/**
 * Returns the parent node id for nested floating elements, if available.
 * Returns `null` for top-level floating elements.
 */
export const useFloatingParentNodeId = () => {
  const context = useContext(FloatingNodeContext);
  return access(context?.id) || null;
};

/**
 * Returns the nearest floating tree context, if available.
 */
export const useFloatingTree = (externalTree?: FloatingTreeStore): FloatingTreeType | null => {
  const contextTree = useContext(FloatingTreeContext) as FloatingTreeType | null;
  return externalTree ?? contextTree;
};

/**
 * Registers a node into the `FloatingTree`, returning its id.
 * @see https://floating-ui.com/docs/FloatingTree
 */
export function useFloatingNodeId(externalTree?: FloatingTreeStore): Accessor<string | undefined> {
  const id = useId();
  const tree = useFloatingTree(externalTree);
  const parentContext = useContext(FloatingNodeContext);

  createRenderEffect(() => {
    const nodeId = id();
    if (!nodeId) {
      return;
    }

    const node = { id: nodeId, parentId: access(parentContext?.id) || null };
    tree?.addNode(node);

    onCleanup(() => {
      tree?.removeNode(node);
    });
  });

  return id;
}

export interface FloatingNodeProps {
  children?: JSX.Element;
  id: string | undefined;
}

/**
 * Provides parent node context for nested floating elements.
 * @see https://floating-ui.com/docs/FloatingTree
 * @internal
 */
export function FloatingNode(props: FloatingNodeProps): JSX.Element {
  const parentId = useFloatingParentNodeId();
  const contextValue = { id: () => props.id, parentId: () => parentId };

  return (
    <FloatingNodeContext.Provider value={contextValue}>
      {props.children}
    </FloatingNodeContext.Provider>
  );
}

export interface FloatingTreeProps {
  children?: JSX.Element;
  externalTree?: FloatingTreeStore | undefined;
}

/**
 * Provides context for nested floating elements when they are not children of
 * each other on the DOM.
 * This is not necessary in all cases, except when there must be explicit communication between parent and child floating elements. It is necessary for:
 * - The `bubbles` option in the `useDismiss()` Hook
 * - Nested virtual list navigation
 * - Nested floating elements that each open on hover
 * - Custom communication between parent and child floating elements
 * @see https://floating-ui.com/docs/FloatingTree
 * @internal
 */
export function FloatingTree(props: FloatingTreeProps): JSX.Element {
  // eslint-disable-next-line solid/reactivity
  const tree = props.externalTree ?? new FloatingTreeStore();
  return <FloatingTreeContext.Provider value={tree}>{props.children}</FloatingTreeContext.Provider>;
}
