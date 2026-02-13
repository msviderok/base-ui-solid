import { splitComponentProps } from '../../solid-helpers';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useSelectRootContext } from '../root/SelectRootContext';

/**
 * An icon that indicates that the trigger button opens a select popup.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectIcon(componentProps: SelectIcon.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { store } = useSelectRootContext();
  const open = store.useState('open');

  const state: SelectIcon.State = {
    get open() {
      return open();
    },
  };

  const element = useRenderElement('span', componentProps, {
    state,
    props: [{ 'aria-hidden': true }, elementProps],
    stateAttributesMapping: triggerOpenStateMapping,
    get children() {
      return <>{componentProps.children ?? '▼'}</>;
    },
  });

  return <>{element()}</>;
}

export interface SelectIconState {
  /**
   * Whether the select popup is currently open.
   */
  open: boolean;
}

export interface SelectIconProps extends BaseUIComponentProps<'span', SelectIcon.State> {}

export namespace SelectIcon {
  export type State = SelectIconState;
  export type Props = SelectIconProps;
}
