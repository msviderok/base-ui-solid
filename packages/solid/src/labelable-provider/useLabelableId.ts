import { isElement } from '@floating-ui/utils/dom';
import { createEffect, onCleanup } from 'solid-js';
import { access, type MaybeAccessor } from '../solid-helpers';
import { NOOP } from '../utils/noop';
import { useBaseUiId } from '../utils/useBaseUiId';
import { useLabelableContext } from './LabelableContext';

export function useLabelableId(params: useLabelableId.Parameters = {}) {
  const id = () => access(params.id);
  const implicit = () => access(params.implicit) ?? false;
  const controlRef = () => access(params.controlRef);

  const { controlId, registerControlId } = useLabelableContext();

  const defaultId = useBaseUiId(id);

  const controlIdForEffect = () => (implicit() ? controlId() : undefined);

  const controlSourceRef = Symbol('labelable-control');
  let hasRegisteredRef = false;
  let hadExplicitIdRef = id() != null;

  const unregisterControlId = () => {
    if (!hasRegisteredRef || registerControlId === NOOP) {
      return;
    }

    hasRegisteredRef = false;
    registerControlId(controlSourceRef, undefined);
  };

  createEffect(() => {
    if (registerControlId === NOOP) {
      return;
    }

    let nextId: string | null | undefined;

    if (implicit()) {
      const elem = controlRef();

      if (isElement(elem) && elem.closest('label') != null) {
        nextId = id() ?? null;
      } else {
        nextId = controlIdForEffect() ?? defaultId();
      }
    } else if (id() != null) {
      hadExplicitIdRef = true;
      nextId = id();
    } else if (hadExplicitIdRef) {
      nextId = defaultId();
    } else {
      unregisterControlId();
      return;
    }

    if (nextId === undefined) {
      unregisterControlId();
      return;
    }

    hasRegisteredRef = true;
    registerControlId(controlSourceRef, nextId);

    return;
  });

  onCleanup(() => {
    unregisterControlId();
  });

  return () => controlId() ?? defaultId();
}

export interface UseLabelableIdParameters {
  id?: MaybeAccessor<string | undefined>;
  /**
   * Whether implicit labelling is supported.
   * @default false
   */
  implicit?: MaybeAccessor<boolean | undefined>;
  /**
   * A ref to an element that can be implicitly labelled.
   */
  controlRef?: MaybeAccessor<(HTMLElement | null) | undefined>;
}

export type UseLabelableIdReturnValue = string;

export namespace useLabelableId {
  export type Parameters = UseLabelableIdParameters;
  export type ReturnValue = UseLabelableIdReturnValue;
}
