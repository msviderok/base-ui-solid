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
  const { controlId, setControlId } = useLabelableContext();
  const defaultId = useBaseUiId(id);

  createEffect(() => {
    const resolvedImplicit = implicit();
    const resolvedId = id();
    if ((!resolvedImplicit && !resolvedId) || setControlId === NOOP) {
      return;
    }

    if (resolvedImplicit) {
      const elem = controlRef();

      if (isElement(elem) && elem.closest('label') != null) {
        setControlId(resolvedId ?? null);
      } else {
        setControlId(controlId() ?? defaultId());
      }
    } else if (resolvedId) {
      setControlId(resolvedId);
    }

    onCleanup(() => {
      if (resolvedId) {
        setControlId(undefined);
      }
    });
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
  controlRef?: MaybeAccessor<HTMLElement | null | undefined>;
}

export type UseLabelableIdReturnValue = string;

export namespace useLabelableId {
  export type Parameters = UseLabelableIdParameters;
  export type ReturnValue = UseLabelableIdReturnValue;
}
