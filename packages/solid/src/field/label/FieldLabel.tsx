import { error } from '@base-ui/utils/error';
import { ownerDocument } from '@base-ui/utils/owner';
import { isHTMLElement } from '@floating-ui/utils/dom';
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
  const [, local, elementProps] = splitComponentProps(componentProps, ['id', 'nativeLabel']);
  const idProp = () => local.id;
  const nativeLabel = () => local.nativeLabel ?? true;

  const fieldRootContext = useFieldRootContext(false);

  const { controlId, setLabelId, labelId } = useLabelableContext();

  const id = useBaseUiId(idProp);

  let labelRef = null as HTMLElement | null | undefined;

  const handleInteraction = (event: MouseEvent) => {
    const target = getTarget(event) as HTMLElement | null;
    if (target?.closest('button,input,select,textarea')) {
      return;
    }

    // Prevent text selection when double clicking label.
    if (!event.defaultPrevented && event.detail > 1) {
      event.preventDefault();
    }

    const controlIdValue = controlId();
    if (nativeLabel() || !controlIdValue) {
      return;
    }

    const controlElement = ownerDocument(event.currentTarget ?? any).getElementById(controlIdValue);
    if (isHTMLElement(controlElement)) {
      controlElement.focus({
        // Available from Chrome 144+ (January 2026).
        // Safari and Firefox already support it.
        // @ts-expect-error not available in types yet
        focusVisible: true,
      });
    }
  };

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      if (!labelRef) {
        return;
      }

      const isLabelTag = labelRef.tagName === 'LABEL';

      if (nativeLabel()) {
        if (!isLabelTag) {
          error(
            '<Field.Label> expected a <label> element because the `nativeLabel` prop is true. ' +
              'Rendering a non-<label> disables native label association, so `htmlFor` will not ' +
              'work. Use a real <label> in the `render` prop, or set `nativeLabel` to `false`.',
          );
        }
      } else if (isLabelTag) {
        error(
          '<Field.Label> expected a non-<label> element because the `nativeLabel` prop is false. ' +
            'Rendering a <label> assumes native label behavior while Base UI treats it as ' +
            'non-native, which can cause unexpected pointer behavior. Use a non-<label> in the ' +
            '`render` prop, or set `nativeLabel` to `true`.',
        );
      }
    });
  }

  createEffect(() => {
    if (id()) {
      setLabelId(id());
    }

    onCleanup(() => {
      setLabelId(undefined);
    });
  });

  const element = useRenderElement('label', componentProps, {
    ref: (el) => {
      labelRef = el;
    },
    state: fieldRootContext.state,
    get props() {
      return [
        { id: labelId() },
        nativeLabel()
          ? {
              htmlFor: controlId() ?? undefined,
              onMouseDown: handleInteraction,
            }
          : {
              onClick: handleInteraction,
              onPointerDown(event: PointerEvent) {
                event.preventDefault();
              },
            },
        elementProps,
      ];
    },
    stateAttributesMapping: fieldValidityMapping,
  });

  return <>{element()}</>;
}

export type FieldLabelState = FieldRoot.State;

export interface FieldLabelProps extends BaseUIComponentProps<'label', FieldLabel.State> {
  /**
   * Whether the component renders a native `<label>` element when replacing it via the `render` prop.
   * Set to `false` if the rendered element is not a label (e.g. `<div>`).
   *
   * This is useful to avoid inheriting label behaviors on `<button>` controls (such as `<Select.Trigger>` and `<Combobox.Trigger>`), including avoiding `:hover` on the button when hovering the label, and preventing clicks on the label from firing on the button.
   * @default true
   */
  nativeLabel?: boolean | undefined;
}

export namespace FieldLabel {
  export type State = FieldLabelState;
  export type Props = FieldLabelProps;
}
