import { createEffect, onCleanup } from 'solid-js';
import { produce, reconcile } from 'solid-js/store';
import { useFormContext } from '../form/FormContext';
import { type MaybeAccessor, access, useRef } from '../solid-helpers';
import { useFieldRootContext } from './root/FieldRootContext';
import { getCombinedFieldValidityData } from './utils/getCombinedFieldValidityData';

export function useField(params: UseFieldParameters) {
  const { setFormRef } = useFormContext();
  const { invalid, markedDirtyRef, validityData, setValidityData } = useFieldRootContext();
  const enabled = () => access(params.enabled) ?? true;
  const value = () => access(params.value);
  const id = () => access(params.id);
  const name = () => access(params.name);
  const controlRef = () => access(params.controlRef);
  const initialValueInitializedRef = useRef(false);

  createEffect(() => {
    if (!enabled() || initialValueInitializedRef.current) {
      return;
    }

    let initialValue = value();
    if (initialValue === undefined) {
      initialValue = params.getValue?.();
    }

    initialValueInitializedRef.current = true;

    if (validityData.initialValue === null && initialValue !== null) {
      setValidityData('initialValue', initialValue);
    }
  });

  createEffect(() => {
    const idValue = id();
    if (!enabled() || !idValue) {
      return;
    }

    setFormRef(
      'fields',
      idValue,
      reconcile({
        getValue: params.getValue ?? (() => undefined),
        name: name(),
        controlRef: controlRef(),
        validityData: getCombinedFieldValidityData(validityData, invalid()),
        validate() {
          let nextValue = value();
          if (nextValue === undefined) {
            nextValue = params.getValue?.();
          }
          markedDirtyRef.current = true;
          // Synchronously update the validity state so the submit event can be prevented.
          params.commit(nextValue);
        },
      }),
    );
  });

  createEffect(() => {
    const idValue = id();
    onCleanup(() => {
      if (idValue) {
        setFormRef(
          'fields',
          produce((fields) => {
            delete fields[idValue];
          }),
        );
      }
    });
  });
}

export interface UseFieldParameters {
  enabled?: MaybeAccessor<boolean | undefined>;
  value: MaybeAccessor<unknown>;
  getValue?: (() => unknown) | undefined;
  id: MaybeAccessor<string | undefined>;
  name?: MaybeAccessor<string | undefined>;
  commit: (value: unknown) => void;
  /**
   * A ref to a focusable element that receives focus when the field fails
   * validation during form submission.
   */
  controlRef: MaybeAccessor<any>;
}
