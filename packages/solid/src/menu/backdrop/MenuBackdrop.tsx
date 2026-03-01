import type { JSX } from 'solid-js';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { splitComponentProps } from '../../solid-helpers';
import { type StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { popupStateMapping as baseMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { useMenuRootContext } from '../root/MenuRootContext';

const stateAttributesMapping: StateAttributesMapping<MenuBackdrop.State> = {
  ...baseMapping,
  ...transitionStatusMapping,
};

/**
 * An overlay displayed beneath the menu popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuBackdrop(componentProps: MenuBackdrop.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { store } = useMenuRootContext();
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');

  const contextMenuContext = useContextMenuRootContext();

  const state: MenuBackdrop.State = {
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
      if (contextMenuContext) {
        contextMenuContext.backdropRef.current = el;
      }
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
            'pointer-events': lastOpenChangeReason() === REASONS.triggerHover ? 'none' : undefined,
            'user-select': 'none',
            '-webkit-user-select': 'none',
          };
        },
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface MenuBackdropState {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  transitionStatus: TransitionStatus;
}

export interface MenuBackdropProps extends BaseUIComponentProps<'div', MenuBackdrop.State> {}

export namespace MenuBackdrop {
  export type State = MenuBackdropState;
  export type Props = MenuBackdropProps;
}
