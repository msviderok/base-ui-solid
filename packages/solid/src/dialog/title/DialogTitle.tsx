import { splitComponentProps } from '../../solid-helpers';
import { type BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useDialogRootContext } from '../root/DialogRootContext';

/**
 * A heading that labels the dialog.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogTitle(componentProps: DialogTitle.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id']);
  const idProp = () => local.id;
  const { store } = useDialogRootContext();

  const id = useBaseUiId(idProp);

  store.useSyncedValueWithCleanup('titleElementId', id);

  const element = useRenderElement('h2', componentProps, {
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

export interface DialogTitleProps extends BaseUIComponentProps<'h2', DialogTitle.State> {}

export interface DialogTitleState {}

export namespace DialogTitle {
  export type Props = DialogTitleProps;
  export type State = DialogTitleState;
}
