import { isElement } from '@floating-ui/utils/dom';
import { createEffect } from 'solid-js';
import { defaultProps } from '../../solid-helpers';
import type { BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { PopupTriggerMap } from '../../utils/popups';
import { useId } from '../../utils/useId';
import { FloatingRootStore, type FloatingRootState } from '../components/FloatingRootStoreV2';
import { useFloatingParentNodeId } from '../components/FloatingTree';
import type { ReferenceType } from '../types';

export interface UseFloatingRootContextOptions {
  open?: boolean | undefined;
  onOpenChange?: (open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void;
  elements?:
    | {
        reference?: (ReferenceType | null) | undefined;
        floating?: (HTMLElement | null) | undefined;
      }
    | undefined;
}

export function useFloatingRootContext(options: UseFloatingRootContextOptions): FloatingRootStore {
  const props = defaultProps(options, { open: false, elements: {} as any });
  const floatingId = useId();
  const nested = useFloatingParentNodeId() != null;

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      const optionDomReference = props.elements?.reference;
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
      return props.open;
    },
    get onOpenChange() {
      return props.onOpenChange;
    },
    get referenceElement() {
      return props.elements?.reference ?? null;
    },
    get floatingElement() {
      return props.elements?.floating ?? null;
    },
    triggerElements: new PopupTriggerMap(),
    get floatingId() {
      return floatingId();
    },
    nested,
    noEmit: false,
  });

  createEffect(() => {
    const ref = props.elements?.reference;
    const valuesToSync: Writeable<Partial<FloatingRootState>> = {
      open: props.open,
      floatingId: floatingId(),
    };

    // Only sync elements that are defined to avoid overwriting existing ones
    if (ref !== undefined) {
      valuesToSync.referenceElement = ref;
      valuesToSync.domReferenceElement = isElement(ref) ? ref : null;
    }

    if (props.elements?.floating !== undefined) {
      valuesToSync.floatingElement = props.elements.floating;
    }

    store.context.onOpenChange = props.onOpenChange;
    store.context.nested = nested;
    store.context.noEmit = false;

    store.update(valuesToSync);
  });

  return store;
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
