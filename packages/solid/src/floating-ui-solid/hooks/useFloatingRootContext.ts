import { isElement } from '@floating-ui/utils/dom';
import { createEffect } from 'solid-js';
import { access, type MaybeAccessor } from '../../solid-helpers';
import type { BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { PopupTriggerMap } from '../../utils/popups';
import { useId } from '../../utils/useId';
import { FloatingRootStore, type FloatingRootState } from '../components/FloatingRootStoreV2';
import { useFloatingParentNodeId } from '../components/FloatingTree';
import type { ReferenceType } from '../types';

export interface UseFloatingRootContextOptions {
  open?: MaybeAccessor<boolean | undefined>;
  onOpenChange?: (open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void;
  elements?:
    | {
        reference?: MaybeAccessor<(ReferenceType | null) | undefined>;
        floating?: MaybeAccessor<(HTMLElement | null) | undefined>;
      }
    | undefined;
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

  const store = FloatingRootStore({
    get open() {
      return open();
    },
    onOpenChange: options.onOpenChange,
    get referenceElement() {
      return access(options.elements?.reference) ?? null;
    },
    get floatingElement() {
      return access(options.elements?.floating) ?? null;
    },
    triggerElements: new PopupTriggerMap(),
    get floatingId() {
      return floatingId();
    },
    nested,
    noEmit: false,
  });

  createEffect(() => {
    const valuesToSync: Writeable<Partial<FloatingRootState>> = {
      open: open(),
      floatingId: floatingId(),
    };

    // Only sync elements that are defined to avoid overwriting existing ones
    if (options.elements?.reference !== undefined) {
      const ref = access(options.elements.reference);
      valuesToSync.referenceElement = ref;
      valuesToSync.domReferenceElement = isElement(ref) ? ref : null;
    }

    if (options.elements?.floating !== undefined) {
      valuesToSync.floatingElement = access(options.elements.floating);
    }

    store.update(valuesToSync);
  });

  return store;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
