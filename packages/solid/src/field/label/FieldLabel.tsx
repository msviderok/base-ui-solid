import { createEffect, onCleanup } from 'solid-js';
import { getTarget } from '../../floating-ui-solid/utils';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { FieldRoot } from '../root/FieldRoot';
import { useFieldRootContext } from '../root/FieldRootContext';
import { fieldValidityMapping } from '../utils/constants';

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<label>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldLabel(componentProps: FieldLabel.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id']);
  const idProp = () => local.id;

  const fieldRootContext = useFieldRootContext(false);

  const { controlId, setLabelId, labelId } = useLabelableContext();

  const id = useBaseUiId(idProp);
  let labelRef = null as HTMLLabelElement | null | undefined;

  createEffect(() => {
    const resolvedId = id();
    if (resolvedId) {
      setLabelId(resolvedId);
    }

    onCleanup(() => {
      setLabelId(undefined);
    });
  });

  const element = useRenderElement('label', componentProps, {
    state: fieldRootContext.state,
    ref: (el) => {
      labelRef = el;
    },
    props: [
      {
        get id() {
          return labelId();
        },
        get for() {
          return controlId() ?? undefined;
        },
        onMouseDown(event) {
          const target = getTarget(event) as HTMLElement | null;
          if (target?.closest('button,input,select,textarea')) {
            return;
          }

          // Prevent text selection when double clicking label.
          if (!event.defaultPrevented && event.detail > 1) {
            event.preventDefault();
          }
        },
      },
      elementProps,
    ],
    stateAttributesMapping: fieldValidityMapping,
  });

  return <>{element()}</>;
}

export type FieldLabelState = FieldRoot.State;

export interface FieldLabelProps extends BaseUIComponentProps<'label', FieldLabel.State> {}

export namespace FieldLabel {
  export type State = FieldLabelState;
  export type Props = FieldLabelProps;
}
