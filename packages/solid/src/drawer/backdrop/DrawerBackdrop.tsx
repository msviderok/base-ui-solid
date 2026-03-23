import type { JSX } from 'solid-js';
import { useDialogRootContext } from '../../dialog/root/DialogRootContext';
import { splitComponentProps } from '../../solid-helpers';
import { type StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { popupStateMapping as baseMapping } from '../../utils/popupStateMapping';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import { type BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { type TransitionStatus } from '../../utils/useTransitionStatus';
import { DrawerPopupCssVars } from '../popup/DrawerPopupCssVars';
import { DrawerBackdropCssVars } from './DrawerBackdropCssVars';

const stateAttributesMapping: StateAttributesMapping<DrawerBackdrop.State> = {
  ...baseMapping,
  ...transitionStatusMapping,
};

/**
 * An overlay displayed beneath the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export function DrawerBackdrop(componentProps: DrawerBackdrop.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['forceRender']);
  const forceRender = () => local.forceRender ?? false;
  const { store } = useDialogRootContext();

  const open = store.useState('open');
  const nested = store.useState('nested');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');

  const state: DrawerBackdrop.State = {
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
      store.context.backdropRef.current = el;
    },
    stateAttributesMapping,
    props: [
      {
        role: 'presentation',
        get hidden() {
          return !mounted();
        },
        get style(): JSX.CSSProperties {
          return {
            'pointer-events': !open() ? 'none' : undefined,
            'user-select': 'none',
            '-webkit-user-select': 'none',
            [DrawerBackdropCssVars.swipeProgress]: '0',
            [DrawerPopupCssVars.swipeStrength]: '1',
          };
        },
      },
      elementProps,
    ],
    enabled: () => forceRender() || !nested(),
  });

  return <>{element()}</>;
}

export interface DrawerBackdropProps extends BaseUIComponentProps<'div', DrawerBackdrop.State> {
  /**
   * Whether the backdrop is forced to render even when nested.
   * @default false
   */
  forceRender?: boolean | undefined;
}

export interface DrawerBackdropState {
  /**
   * Whether the drawer is currently open.
   */
  open: boolean;
  transitionStatus: TransitionStatus;
}

export namespace DrawerBackdrop {
  export type Props = DrawerBackdropProps;
  export type State = DrawerBackdropState;
}
