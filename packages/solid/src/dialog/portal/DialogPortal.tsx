import { Show, splitProps } from 'solid-js';
import { FloatingPortal } from '../../floating-ui-solid';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { useDialogRootContext } from '../root/DialogRootContext';
import { DialogPortalContext } from './DialogPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogPortal(props: DialogPortal.Props) {
  const [local, portalProps] = splitProps(props, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const { store } = useDialogRootContext();
  const mounted = store.useState('mounted');
  const modal = store.useState('modal');
  const open = store.useState('open');

  const shouldRender = () => mounted() || keepMounted();

  return (
    <Show when={shouldRender()}>
      <DialogPortalContext.Provider value={keepMounted}>
        <FloatingPortal {...portalProps}>
          {mounted() && modal() === true && (
            <InternalBackdrop
              ref={(el) => {
                store.context.refs.internalBackdropRef = el;
              }}
              inert={!open()}
            />
          )}
          {props.children}
        </FloatingPortal>
      </DialogPortalContext.Provider>
    </Show>
  );
}

export namespace DialogPortal {
  export interface State {}
}

export interface DialogPortalProps extends FloatingPortal.Props<DialogPortal.State> {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * A parent element to render the portal element into.
   */
  container?: FloatingPortal.Props<DialogPortal.State>['container'] | undefined;
}

export namespace DialogPortal {
  export type Props = DialogPortalProps;
}
