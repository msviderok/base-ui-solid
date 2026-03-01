import { createContext, useContext, type Accessor } from 'solid-js';
import type { ReactLikeRef } from '../../solid-helpers';
import type { ContextMenuRoot } from './ContextMenuRoot';

export interface ContextMenuRootContext {
  anchor: { getBoundingClientRect: () => DOMRect };
  backdropRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  internalBackdropRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  positionerRef: ReactLikeRef<HTMLElement | null | undefined>;
  actionsRef: ReactLikeRef<{
    setOpen: (nextOpen: boolean, eventDetails: ContextMenuRoot.ChangeEventDetails) => void;
  } | null>;
  allowMouseUpTriggerRef: ReactLikeRef<boolean>;
  initialCursorPointRef: ReactLikeRef<{ x: number; y: number } | null>;
  rootId: Accessor<string | undefined>;
}

export const ContextMenuRootContext = createContext<ContextMenuRootContext>();

export function useContextMenuRootContext(optional: false): ContextMenuRootContext;
export function useContextMenuRootContext(optional?: true): ContextMenuRootContext | undefined;
export function useContextMenuRootContext(optional = true) {
  const context = useContext(ContextMenuRootContext);
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: ContextMenuRootContext is missing. ContextMenu parts must be placed within <ContextMenu.Root>.',
    );
  }
  return context;
}
