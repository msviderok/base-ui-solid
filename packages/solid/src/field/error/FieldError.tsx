import { createEffect, createMemo, For, onCleanup, splitProps } from 'solid-js';
import { useFormContext } from '../../form/FormContext';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { FieldRoot } from '../root/FieldRoot';
import { useFieldRootContext } from '../root/FieldRootContext';
import { fieldValidityMapping } from '../utils/constants';

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

  const { validityData, state, name } = useFieldRootContext(false);
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

  const element = useRenderElement('div', componentProps, {
    state,
    enabled: rendered,
    props: [
      {
        get id() {
          return id();
        },
        get children() {
          return (
            <>
              {componentProps.children ?? (
                <>
                  {formError() ||
                    (validityData.errors.length > 1 ? (
                      <ul>
                        {' '}
                        <For each={validityData.errors}>{(message) => <li>{message}</li>}</For>{' '}
                      </ul>
                    ) : (
                      validityData.error
                    ))}
                </>
              )}
            </>
          );
        },
      },
      elementProps,
    ],
    stateAttributesMapping: fieldValidityMapping,
  });

  return <>{element()}</>;
}

export type FieldErrorState = FieldRoot.State;

export interface FieldErrorProps extends BaseUIComponentProps<'div', FieldError.State> {
  /**
   * Determines whether to show the error message according to the field’s
   * [ValidityState](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState).
   * Specifying `true` will always show the error message, and lets external libraries
   * control the visibility.
   */
  match?: boolean | keyof ValidityState;
}

export namespace FieldError {
  export type State = FieldErrorState;
  export type Props = FieldErrorProps;
}
