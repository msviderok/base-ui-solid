import type { JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useFloatingPortalNode, type FloatingPortal } from '../floating-ui-solid';

/**
 * `FloatingPortal` includes tabbable logic handling for focus management.
 * For components that don't need tabbable logic, use `FloatingPortalLite`.
 * @internal
 */
export function FloatingPortalLite(props: FloatingPortalLite.Props<any>) {
  const { portalMount, portalRef } = useFloatingPortalNode({ root: () => props.root });

  return (
    <Portal mount={portalMount()} ref={portalRef}>
      {props.children}
    </Portal>
  );
}

export interface FloatingPortalLiteProps<State> extends FloatingPortal.Props<State> {}

export namespace FloatingPortalLite {
  export type Props<State> = FloatingPortalLiteProps<State>;
}
