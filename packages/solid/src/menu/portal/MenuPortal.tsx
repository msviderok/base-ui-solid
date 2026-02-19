import { Show, splitProps } from 'solid-js';
import { FloatingPortal } from '../../floating-ui-solid';
import { useMenuRootContext } from '../root/MenuRootContext';
import { MenuPortalContext } from './MenuPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPortal(props: MenuPortal.Props) {
  const [local, portalProps] = splitProps(props, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const { store } = useMenuRootContext();
  const mounted = store.useState('mounted');

  const shouldRender = () => mounted() || keepMounted();

  return (
    <Show when={shouldRender()}>
      <MenuPortalContext.Provider value={keepMounted}>
        <FloatingPortal {...portalProps} />
      </MenuPortalContext.Provider>
    </Show>
  );
}

export namespace MenuPortal {
  export interface State {}
}

export interface MenuPortalProps extends FloatingPortal.Props<MenuPortal.State> {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace MenuPortal {
  export type Props = MenuPortalProps;
}
