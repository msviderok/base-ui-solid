import { Show, splitProps } from 'solid-js';
import { FloatingPortal } from '../../floating-ui-solid';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { NavigationMenuPortalContext } from './NavigationMenuPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuPortal(props: NavigationMenuPortal.Props) {
  const [local, portalProps] = splitProps(props, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const { mounted } = useNavigationMenuRootContext();

  const shouldRender = () => mounted() || keepMounted();

  return (
    <Show when={shouldRender()}>
      <NavigationMenuPortalContext.Provider value={keepMounted}>
        <FloatingPortal {...portalProps} ref={props.ref} />
      </NavigationMenuPortalContext.Provider>
    </Show>
  );
}

export namespace NavigationMenuPortal {
  export interface State {}
}

export interface NavigationMenuPortalProps extends FloatingPortal.Props<NavigationMenuPortal.State> {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * A parent element to render the portal element into.
   */
  container?: FloatingPortal.Props<NavigationMenuPortal.State>['container'] | undefined;
}

export namespace NavigationMenuPortal {
  export type Props = NavigationMenuPortalProps;
}
