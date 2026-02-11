'use client';
import { splitComponentProps } from '../../solid-helpers';
import { type StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { popupStateMapping as baseMapping } from '../../utils/popupStateMapping';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import { type BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { type TransitionStatus } from '../../utils/useTransitionStatus';
import { useDialogPortalContext } from '../portal/DialogPortalContext';
import { useDialogRootContext } from '../root/DialogRootContext';
import { DialogViewportDataAttributes } from './DialogViewportDataAttributes';

const stateAttributesMapping: StateAttributesMapping<DialogViewport.State> = {
  ...baseMapping,
  ...transitionStatusMapping,
  nested(value) {
    return value ? { [DialogViewportDataAttributes.nested]: '' } : null;
  },
  nestedDialogOpen(value) {
    return value ? { [DialogViewportDataAttributes.nestedDialogOpen]: '' } : null;
  },
};

/**
 * A positioning container for the dialog popup that can be made scrollable.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogViewport(componentProps: DialogViewport.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const keepMounted = useDialogPortalContext();
  const { store } = useDialogRootContext();

  const open = store.useState('open');
  const nested = store.useState('nested');
  const transitionStatus = store.useState('transitionStatus');
  const nestedOpenDialogCount = store.useState('nestedOpenDialogCount');
  const mounted = store.useState('mounted');

  const nestedDialogOpen = () => nestedOpenDialogCount() > 0;

  const state: DialogViewport.State = {
    get open() {
      return open();
    },
    get nested() {
      return nested();
    },
    get transitionStatus() {
      return transitionStatus();
    },
    get nestedDialogOpen() {
      return nestedDialogOpen();
    },
  };

  const shouldRender = () => keepMounted() || mounted();

  return useRenderElement('div', componentProps, {
    enabled: shouldRender,
    state,
    ref: store.useStateSetter('viewportElement'),
    stateAttributesMapping,
    props: [
      {
        role: 'presentation',
        get hidden() {
          return !mounted();
        },
      },
      elementProps,
    ],
  });
}

export interface DialogViewportState {
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
  transitionStatus: TransitionStatus;
  /**
   * Whether the dialog is nested within another dialog.
   */
  nested: boolean;
  /**
   * Whether the dialog has nested dialogs open.
   */
  nestedDialogOpen: boolean;
}

export interface DialogViewportProps extends BaseUIComponentProps<'div', DialogViewportState> {}

export namespace DialogViewport {
  export type State = DialogViewportState;
  export type Props = DialogViewportProps;
}
