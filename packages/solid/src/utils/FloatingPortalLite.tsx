import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';
import { useFloatingPortalNode, type FloatingPortal } from '../floating-ui-solid';

/**
 * `FloatingPortal` includes tabbable logic handling for focus management.
 * For components that don't need tabbable logic, use `FloatingPortalLite`.
 * @internal
 */
export function FloatingPortalLite(componentProps: FloatingPortalLite.Props<any>): JSX.Element {
  const [local, , elementProps] = splitProps(
    componentProps,
    ['container', 'class', 'render'],
    ['children'],
  );

  const { portalSubtree } = useFloatingPortalNode({
    get container() {
      return local.container;
    },
    ref: (el) => {
      if (typeof componentProps.ref === 'function') {
        componentProps.ref(el);
      } else {
        componentProps.ref = el;
      }
    },
    componentProps: local,
    elementProps,
  });

  return <>{portalSubtree()}</>;
}

export interface FloatingPortalLiteProps<State> extends FloatingPortal.Props<State> {}

export namespace FloatingPortalLite {
  export type Props<State> = FloatingPortalLiteProps<State>;
}
