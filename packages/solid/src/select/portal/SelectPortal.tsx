import { Show } from 'solid-js';
import { FloatingPortal } from '../../floating-ui-solid';
import { useSelectRootContext } from '../root/SelectRootContext';
import { SelectPortalContext } from './SelectPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectPortal(props: SelectPortal.Props) {
  const { store } = useSelectRootContext();
  const mounted = store.useState('mounted');
  const forceMount = store.useState('forceMount');

  const shouldRender = () => mounted() || forceMount();

  return (
    <Show when={shouldRender()}>
      <SelectPortalContext.Provider value>
        <FloatingPortal {...props} />
      </SelectPortalContext.Provider>
    </Show>
  );
}

export namespace SelectPortal {
  export interface State {}
}

export interface SelectPortalProps extends FloatingPortal.Props<SelectPortal.State> {}

export namespace SelectPortal {
  export type Props = SelectPortalProps;
}
