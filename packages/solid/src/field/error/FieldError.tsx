import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
  mergeProps as solidMergeProps,
  splitProps,
  type JSX,
} from 'solid-js';
import { useFormContext } from '../../form/FormContext';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTransitionStatus, type TransitionStatus } from '../../utils/useTransitionStatus';
import { FieldRoot } from '../root/FieldRoot';
import { useFieldRootContext } from '../root/FieldRootContext';
import { fieldValidityMapping } from '../utils/constants';

const stateAttributesMapping: StateAttributesMapping<FieldError.State> = {
  ...fieldValidityMapping,
  ...transitionStatusMapping,
};

/**
 * An error message displayed if the field control fails validation.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldError(componentProps: FieldError.Props) {
  const [local, elementProps] = splitProps(componentProps, ['id', 'match']);
  const idProp = () => local.id;

  const id = useBaseUiId(idProp);

  const { validityData, state: fieldState, name } = useFieldRootContext(false);
  const { setMessageIds } = useLabelableContext();

  const { errors } = useFormContext();

  const formError = () => (name() ? errors()[name()!] : null);

  const rendered = createMemo(() => {
    let isRendered = false;
    if (formError() || local.match === true) {
      isRendered = true;
    } else if (local.match) {
      isRendered = Boolean(validityData.state[local.match]);
    } else {
      isRendered = validityData.state.valid === false;
    }
    return isRendered;
  });

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(() => rendered());

  createEffect(() => {
    const idValue = id();
    if (!rendered() || !idValue) {
      return;
    }

    setMessageIds((v) => v.concat(idValue));

    onCleanup(() => {
      setMessageIds((v) => v.filter((item) => item !== idValue));
    });
  });

  let errorRef = null as HTMLDivElement | null | undefined;
  const [lastRenderedMessage, setLastRenderedMessage] = createSignal<JSX.Element>(null);
  const [lastRenderedMessageKey, setLastRenderedMessageKey] = createSignal<string | null>(null);

  const errorMessage = createMemo(() => {
    return (
      <>
        {formError() ||
          (validityData.errors.length > 1 ? (
            <ul>
              <For each={validityData.errors}>{(message) => <li>{message}</li>}</For>
            </ul>
          ) : (
            <>{validityData.error}</>
          ))}
      </>
    );
  });

  const errorKey = createMemo(() => {
    const err = formError();
    if (err != null) {
      return Array.isArray(err) ? JSON.stringify(err) : err;
    }
    if (validityData.errors.length > 1) {
      return JSON.stringify(validityData.errors);
    }
    return validityData.error;
  });

  createEffect(() => {
    if (rendered() && errorKey() !== lastRenderedMessageKey()) {
      setLastRenderedMessageKey(errorKey());
      setLastRenderedMessage(errorMessage());
    }
  });

  useOpenChangeComplete({
    open: rendered,
    ref: () => errorRef,
    onComplete() {
      if (!rendered()) {
        setMounted(false);
      }
    },
  });

  const state: FieldError.State = solidMergeProps(fieldState, {
    get transitionStatus() {
      return transitionStatus();
    },
  });

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      errorRef = el;
    },
    state,
    props: [
      {
        get id() {
          return id();
        },
        get children() {
          return <>{rendered() ? errorMessage() : lastRenderedMessage()}</>;
        },
      },
      elementProps,
    ],
    stateAttributesMapping,
    enabled: mounted,
  });

  return <Show when={mounted()}>{element()}</Show>;
}

export interface FieldErrorState extends FieldRoot.State {
  transitionStatus: TransitionStatus;
}

export interface FieldErrorProps extends BaseUIComponentProps<'div', FieldError.State> {
  /**
   * Determines whether to show the error message according to the field’s
   * [ValidityState](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState).
   * Specifying `true` will always show the error message, and lets external libraries
   * control the visibility.
   */
  match?: (boolean | keyof ValidityState) | undefined;
}

export namespace FieldError {
  export type State = FieldErrorState;
  export type Props = FieldErrorProps;
}
