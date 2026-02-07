import { createEffect, onCleanup } from 'solid-js';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { FieldRoot } from '../root/FieldRoot';
import { useFieldRootContext } from '../root/FieldRootContext';
import { fieldValidityMapping } from '../utils/constants';

/**
 * A paragraph with additional information about the field.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldDescription(componentProps: FieldDescription.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id']);

  const id = useBaseUiId(() => local.id);

  const fieldRootContext = useFieldRootContext(false);
  const { setMessageIds } = useLabelableContext();

  createEffect(() => {
    const idValue = id();
    if (!idValue) {
      return;
    }

    setMessageIds((v) => v.concat(idValue));

    onCleanup(() => {
      setMessageIds((v) => v.filter((item) => item !== idValue));
    });
  });

  const element = useRenderElement('p', componentProps, {
    state: fieldRootContext.state,
    props: [
      {
        get id() {
          return id();
        },
      },
      elementProps,
    ],
    stateAttributesMapping: fieldValidityMapping,
  });

  return <>{element()}</>;
}

export type FieldDescriptionState = FieldRoot.State;

export interface FieldDescriptionProps extends BaseUIComponentProps<'p', FieldDescription.State> {}

export namespace FieldDescription {
  export type State = FieldDescriptionState;
  export type Props = FieldDescriptionProps;
}
