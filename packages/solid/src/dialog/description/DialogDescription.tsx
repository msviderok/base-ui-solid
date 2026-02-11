import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useDialogRootContext } from '../root/DialogRootContext';

/**
 * A paragraph with additional information about the dialog.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogDescription(componentProps: DialogDescription.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id']);
  const idProp = () => local.id;
  const { store } = useDialogRootContext();

  const id = useBaseUiId(idProp);

  store.useSyncedValueWithCleanup('descriptionElementId', id);

  const element = useRenderElement('p', componentProps, {
    props: [
      {
        get id() {
          return id();
        },
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface DialogDescriptionProps extends BaseUIComponentProps<
  'p',
  DialogDescription.State
> {}

export interface DialogDescriptionState {}

export namespace DialogDescription {
  export type Props = DialogDescriptionProps;
  export type State = DialogDescriptionState;
}
