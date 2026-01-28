import { isElement } from '@floating-ui/utils/dom';
import { createEffect } from 'solid-js';
import { access, type MaybeAccessor } from '../../solid-helpers';
import type { BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { PopupTriggerMap } from '../../utils/popups';
import { useId } from '../../utils/useId';
import { FloatingRootStore, type FloatingRootState } from '../components/FloatingRootStore';
import { useFloatingParentNodeId } from '../components/FloatingTree';

export interface UseFloatingRootContextOptions {
  open?: MaybeAccessor<boolean | undefined>;
  onOpenChange?: (open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void;
  elements?: {
    reference?: MaybeAccessor<Element | null | undefined>;
    floating?: MaybeAccessor<HTMLElement | null | undefined>;
    /** Non-reactive */
    triggers?: PopupTriggerMap;
  };
  /** Non-reactive. Whether to prevent the auto-emitted `openchange` event. */
  noEmit?: boolean;
}

export function useFloatingRootContext(options: UseFloatingRootContextOptions): FloatingRootStore {
  const open = () => access(options.open) ?? false;
  const floatingId = useId();
  const nested = useFloatingParentNodeId() != null;

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      const optionDomReference = access(options.elements?.reference);
      if (optionDomReference && !isElement(optionDomReference)) {
        console.error(
          'Cannot pass a virtual element to the `elements.reference` option,',
          'as it must be a real DOM element. Use `refs.setPositionReference()`',
          'instead.',
        );
      }
    });
  }

  const store = new FloatingRootStore({
    open,
    onOpenChange: options.onOpenChange,
    referenceElement: () => access(options.elements?.reference) ?? null,
    floatingElement: () => access(options.elements?.floating) ?? null,
    triggerElements: options.elements?.triggers ?? new PopupTriggerMap(),
    floatingId,
    nested,
    noEmit: options.noEmit || false,
  });

  createEffect(() => {
    const valuesToSync: Writeable<Partial<FloatingRootState>> = {
      open: open(),
      floatingId: floatingId(),
    };

    // Only sync elements that are defined to avoid overwriting existing ones
    if (options.elements?.reference !== undefined) {
      valuesToSync.referenceElement = access(options.elements.reference);
      valuesToSync.domReferenceElement = isElement(access(options.elements.reference))
        ? access(options.elements.reference)
        : null;
    }

    if (options.elements?.floating !== undefined) {
      valuesToSync.floatingElement = access(options.elements.floating);
    }

    store.update(valuesToSync);
  });

  return store;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
