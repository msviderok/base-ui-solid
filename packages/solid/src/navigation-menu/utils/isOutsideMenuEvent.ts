import { FloatingTreeType } from '../../floating-ui-solid';
import { contains, getNodeChildren } from '../../floating-ui-solid/utils';

interface Targets {
  currentTarget: HTMLElement | null | undefined;
  relatedTarget: HTMLElement | null | undefined;
}

interface Params {
  popupElement: HTMLElement | null | undefined;
  viewportElement?: HTMLElement | null | undefined;
  rootRef: HTMLDivElement | null | undefined;
  tree: FloatingTreeType | null;
  nodeId: string | undefined;
}

export function isOutsideMenuEvent({ currentTarget, relatedTarget }: Targets, params: Params) {
  const { popupElement, viewportElement, rootRef, tree, nodeId } = params;

  const nodeChildrenContains = tree
    ? getNodeChildren(tree.nodesRef, nodeId).some((node) =>
        contains(node.context?.elements.floating(), relatedTarget),
      )
    : [];

  // For nested scenarios without popupElement, we need to be more lenient
  // and only close if we're definitely outside the root
  if (!popupElement) {
    return !contains(rootRef, relatedTarget) && !nodeChildrenContains;
  }

  // Use popupElement as the primary floating element, but fall back to viewportElement if needed
  const floatingElement = popupElement || viewportElement;

  return (
    !contains(floatingElement, currentTarget) &&
    !contains(floatingElement, relatedTarget) &&
    !contains(rootRef, relatedTarget) &&
    !nodeChildrenContains &&
    !(
      contains(floatingElement, relatedTarget) &&
      relatedTarget?.hasAttribute('data-base-ui-focus-guard')
    )
  );
}
