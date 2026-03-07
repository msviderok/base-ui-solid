import { Show, splitProps } from 'solid-js';
import { FloatingPortalLite } from '../../utils/FloatingPortalLite';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';
import { PreviewCardPortalContext } from './PreviewCardPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardPortal(props: PreviewCardPortal.Props) {
  const [local, portalProps] = splitProps(props, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const { store } = usePreviewCardRootContext();
  const mounted = store.useState('mounted');

  const shouldRender = () => mounted() || keepMounted();

  return (
    <Show when={shouldRender()}>
      <PreviewCardPortalContext.Provider value={keepMounted}>
        <FloatingPortalLite {...portalProps} />
      </PreviewCardPortalContext.Provider>
    </Show>
  );
}

export namespace PreviewCardPortal {
  export interface State {}
}

export interface PreviewCardPortalProps extends FloatingPortalLite.Props<PreviewCardPortal.State> {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace PreviewCardPortal {
  export type Props = PreviewCardPortalProps;
}
