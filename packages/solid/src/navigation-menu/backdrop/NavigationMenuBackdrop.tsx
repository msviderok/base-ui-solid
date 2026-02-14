import { splitComponentProps } from '../../solid-helpers';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { popupStateMapping as baseMapping } from '../../utils/popupStateMapping';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

const stateAttributesMapping: StateAttributesMapping<NavigationMenuBackdrop.State> = {
  ...baseMapping,
  ...transitionStatusMapping,
};

/**
 * A backdrop for the navigation menu popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuBackdrop(componentProps: NavigationMenuBackdrop.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { open, mounted, transitionStatus } = useNavigationMenuRootContext();

  const state: NavigationMenuBackdrop.State = {
    get open() {
      return open();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: [
      {
        role: 'presentation',
        get hidden() {
          return !mounted();
        },
        style: { 'user-select': 'none', '-webkit-user-select': 'none' },
      },
      elementProps,
    ],
    stateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface NavigationMenuBackdropState {
  /**
   * If `true`, the popup is open.
   */
  open: boolean;
  /**
   * The transition status of the popup.
   */
  transitionStatus: TransitionStatus;
}

export interface NavigationMenuBackdropProps extends BaseUIComponentProps<
  'div',
  NavigationMenuBackdrop.State
> {}

export namespace NavigationMenuBackdrop {
  export type State = NavigationMenuBackdropState;
  export type Props = NavigationMenuBackdropProps;
}
