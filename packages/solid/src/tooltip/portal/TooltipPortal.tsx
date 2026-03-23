import { Show, splitProps } from 'solid-js';
import { FloatingPortalLite } from '../../utils/FloatingPortalLite';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { TooltipPortalContext } from './TooltipPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipPortal(props: TooltipPortal.Props) {
  const [local, portalProps] = splitProps(props, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const { store } = useTooltipRootContext();
  const mounted = store.useState('mounted');

  const shouldRender = () => mounted() || keepMounted();

  return (
    <Show when={shouldRender()}>
      <TooltipPortalContext.Provider value={keepMounted}>
        <FloatingPortalLite {...portalProps} ref={props.ref} />
      </TooltipPortalContext.Provider>
    </Show>
  );
}

export namespace TooltipPortal {
  export interface State {}
}

export interface TooltipPortalProps extends FloatingPortalLite.Props<TooltipPortal.State> {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace TooltipPortal {
  export type Props = TooltipPortalProps;
}
