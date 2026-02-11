import { Show, splitProps } from 'solid-js';
import { FloatingPortal } from '../../floating-ui-solid';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverPortalContext } from './PopoverPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPortal(props: PopoverPortal.Props) {
  const [local, portalProps] = splitProps(props, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const { store } = usePopoverRootContext();
  const mounted = store.useState('mounted');

  const shouldRender = () => mounted() || keepMounted();

  return (
    <Show when={shouldRender()}>
      <PopoverPortalContext.Provider value={keepMounted}>
        <FloatingPortal {...portalProps} renderGuards={false} />
      </PopoverPortalContext.Provider>
    </Show>
  );
}

export namespace PopoverPortal {
  export interface State {}
}

export interface PopoverPortalProps extends FloatingPortal.Props<PopoverPortal.State> {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean;
}

export namespace PopoverPortal {
  export type Props = PopoverPortalProps;
}
