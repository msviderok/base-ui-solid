import { CompositeItem } from '../../composite/item/CompositeItem';
import { useFloatingTree } from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import {
  useNavigationMenuRootContext,
  useNavigationMenuTreeContext,
} from '../root/NavigationMenuRootContext';
import { isOutsideMenuEvent } from '../utils/isOutsideMenuEvent';

/**
 * A link in the navigation menu that can be used to navigate to a different page or section.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuLink(componentProps: NavigationMenuLink.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'active',
    'closeOnClick',
  ]);
  const active = () => local.active ?? false;
  const closeOnClick = () => local.closeOnClick ?? false;

  const { setValue, popupElement, positionerElement, rootRef } = useNavigationMenuRootContext();
  const nodeId = useNavigationMenuTreeContext();
  const tree = useFloatingTree();

  const state: NavigationMenuLink.State = {
    get active() {
      return active();
    },
  };

  const defaultProps: HTMLProps = {
    get 'aria-current'() {
      return active() ? 'page' : undefined;
    },
    tabIndex: undefined,
    onClick(event) {
      if (closeOnClick()) {
        setValue(null, createChangeEventDetails(REASONS.linkPress, event));
      }
    },
    onBlur(event) {
      const positionerEl = positionerElement();
      const popupEl = popupElement();
      if (
        positionerEl &&
        popupEl &&
        isOutsideMenuEvent(
          {
            currentTarget: event.currentTarget,
            relatedTarget: event.relatedTarget as HTMLElement | null,
          },
          { popupElement: popupEl, rootRef: rootRef.current, tree, nodeId: nodeId?.() },
        )
      ) {
        setValue(null, createChangeEventDetails(REASONS.focusOut, event));
      }
    },
  };

  return (
    <CompositeItem
      tag="a"
      render={renderProps.render}
      class={renderProps.class}
      state={state}
      refs={[
        (el) => {
          if (typeof componentProps.ref === 'function') {
            componentProps.ref(el as HTMLAnchorElement);
          } else {
            componentProps.ref = el as any;
          }
        },
      ]}
      props={[defaultProps, elementProps]}
    />
  );
}

export interface NavigationMenuLinkState {
  /**
   * Whether the link is the currently active page.
   */
  active: boolean;
}

export interface NavigationMenuLinkProps extends BaseUIComponentProps<
  'a',
  NavigationMenuLink.State
> {
  /**
   * Whether the link is the currently active page.
   * @default false
   */
  active?: boolean | undefined;
  /**
   * Whether to close the navigation menu when the link is clicked.
   * @default false
   */
  closeOnClick?: boolean | undefined;
}

export namespace NavigationMenuLink {
  export type State = NavigationMenuLinkState;
  export type Props = NavigationMenuLinkProps;
}
