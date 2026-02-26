import { type VirtualElement } from '@floating-ui/dom';
import { isElement } from '@floating-ui/utils/dom';
import { createEffect, createMemo, createSignal, mergeProps as solidMergeProps } from 'solid-js';
import { access } from '../../solid-helpers';
import { FloatingRootStore } from '../components/FloatingRootStoreV2';
import { useFloatingTree } from '../components/FloatingTree';
import type {
  FloatingContext,
  NarrowedElement,
  ReferenceType,
  UseFloatingOptions,
  UseFloatingReturn,
} from '../types';
import { useFloatingOriginal as usePosition } from './useFloatingOriginal';
import { useFloatingRootContext } from './useFloatingRootContext';

/**
 * Provides data to position a floating element and context to add interactions.
 * @see https://floating-ui.com/docs/useFloating
 */

export function useFloating(options: UseFloatingOptions = {}): UseFloatingReturn {
  const internalRootStore = useFloatingRootContext(options);
  const rootContext = createMemo(() => options.rootContext || internalRootStore);

  const rootContextElements = {
    reference: () => rootContext().useState('referenceElement')(),
    floating: () => rootContext().useState('floatingElement')(),
    domReference: () => rootContext().useState('domReferenceElement')(),
  };

  const [positionReference, setPositionReferenceRaw] = createSignal<
    ReferenceType | null | undefined
  >(null);

  const domReference = createMemo(() => {
    const ref = rootContextElements.domReference();
    return (ref ?? null) as NarrowedElement<ReferenceType> | null | undefined;
  });

  const tree = useFloatingTree();

  const positionOptions = solidMergeProps(options, {
    elements: {
      get floating() {
        return rootContextElements.floating();
      },
      get reference() {
        return positionReference() ?? rootContextElements.reference();
      },
    },
  });
  const position = usePosition(positionOptions);

  const setPositionReference = (node: ReferenceType | null | undefined) => {
    const computedPositionReference = isElement(node)
      ? ({
          getBoundingClientRect: () => node.getBoundingClientRect(),
          getClientRects: () => node.getClientRects(),
          contextElement: node,
        } satisfies VirtualElement)
      : node;
    // Store the positionReference in state if the DOM reference is specified externally via the
    // `elements.reference` option. This ensures that it won't be overridden on future renders.
    setPositionReferenceRaw(computedPositionReference);
    position.refs.setReference(computedPositionReference);
  };

  const [localDomReference, setLocalDomReference] = createSignal<
    NarrowedElement<ReferenceType> | null | undefined
  >(null);
  const [localFloatingElement, setLocalFloatingElement] = createSignal<
    HTMLElement | null | undefined
  >(null);

  createEffect(() => {
    rootContext().useSyncedValue('referenceElement', localDomReference);
    rootContext().useSyncedValue('domReferenceElement', () =>
      isElement(localDomReference()) ? localDomReference() : null,
    );
    rootContext().useSyncedValue('floatingElement', localFloatingElement);
  });

  const setReference = (node: ReferenceType | null | undefined) => {
    if (isElement(node) || node == null) {
      setLocalDomReference(node as NarrowedElement<ReferenceType> | null);
    }

    // Backwards-compatibility for passing a virtual element to `reference`
    // after it has set the DOM reference.
    const reference = position.refs.reference();
    if (
      isElement(reference) ||
      reference == null ||
      // Don't allow setting virtual elements using the old technique back to
      // `null` to support `positionReference` + an unstable `reference`
      // callback ref.
      (node != null && !isElement(node))
    ) {
      position.refs.setReference(node);
    }
  };

  const setFloating = (node: HTMLElement | null | undefined) => {
    setLocalFloatingElement(node);
    position.refs.setFloating(node);
  };

  const refs = solidMergeProps(position.refs, {
    setReference,
    setFloating,
    setPositionReference,
    domReference,
  });

  const elements = solidMergeProps(position.elements, {
    domReference: rootContextElements.domReference,
  });

  const open = () => rootContext().useState('open')();
  const floatingId = () => rootContext().useState('floatingId')();

  const context: FloatingContext = {
    // from UsePositionFloatingReturn
    update: position.update,
    floatingStyles: () => position.floatingStyles,
    isPositioned: () => position.isPositioned,
    placement: () => position.placement,
    strategy: () => position.strategy,
    middlewareData: () => position.middlewareData,
    x: () => position.x,
    y: () => position.y,

    // from FloatingRootContext
    get dataRef() {
      return rootContext().context.dataRef;
    },
    open,
    onOpenChange: (...args) => rootContext().setOpen(...args),
    get events() {
      return rootContext().context.events;
    },
    floatingId,

    // additional
    refs,
    elements,
    nodeId: () => access(options.nodeId),
    get rootStore() {
      return rootContext();
    },
  };

  createEffect(() => {
    rootContext().context.dataRef.floatingContext = context;

    if (!tree) {
      return;
    }

    const nodeId = access(options.nodeId);
    const nodeIdx = tree.nodesRef.findIndex((n) => n.id === nodeId);
    if (nodeIdx !== -1) {
      tree.nodesRef[nodeIdx].context = context as any;
    }
  });

  return {
    update: position.update,
    floatingStyles: () => position.floatingStyles,
    isPositioned: () => position.isPositioned,
    placement: () => position.placement,
    strategy: () => position.strategy,
    middlewareData: () => position.middlewareData,
    x: () => position.x,
    y: () => position.y,
    context,
    refs,
    elements,
    get rootStore() {
      return rootContext() as unknown as FloatingRootStore;
    },
  } as UseFloatingReturn;
}
