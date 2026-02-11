import { splitComponentProps } from '../../solid-helpers';
import { type StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { popupStateMapping as baseMapping } from '../../utils/popupStateMapping';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import { type BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { type TransitionStatus } from '../../utils/useTransitionStatus';
import { useDialogRootContext } from '../root/DialogRootContext';

const stateAttributesMapping: StateAttributesMapping<DialogBackdrop.State> = {
  ...baseMapping,
  ...transitionStatusMapping,
};

/**
 * An overlay displayed beneath the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogBackdrop(componentProps: DialogBackdrop.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['forceRender']);
  const { store } = useDialogRootContext();

  const open = store.useState('open');
  const nested = store.useState('nested');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');

  const state: DialogBackdrop.State = {
    get open() {
      return open();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      store.context.refs.backdropRef = el;
    },
    stateAttributesMapping,
    props: [
      {
        get hidden() {
          return !mounted();
        },
        role: 'presentation',
        style: {
          'user-select': 'none',
          '-webkit-user-select': 'none',
        },
      },
      elementProps,
    ],
    enabled: () => local.forceRender || !nested(),
  });

  return <>{element()}</>;
}

export interface DialogBackdropProps extends BaseUIComponentProps<'div', DialogBackdrop.State> {
  /**
   * Whether the backdrop is forced to render even when nested.
   * @default false
   */
  forceRender?: boolean;
}

export interface DialogBackdropState {
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
  transitionStatus: TransitionStatus;
}

export namespace DialogBackdrop {
  export type Props = DialogBackdropProps;
  export type State = DialogBackdropState;
}
