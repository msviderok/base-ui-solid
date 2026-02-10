import { CompositeItem } from '../../composite/item/CompositeItem';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import type { ToolbarRoot } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';

const TOOLBAR_LINK_METADATA = {
  // links cannot be disabled, this metadata is only used for deriving `disabledIndices``
  // TODO: better name
  focusableWhenDisabled: true,
};

/**
 * A link component.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarLink(componentProps: ToolbarLink.Props) {
  const [renderProps, , elementProps] = splitComponentProps(componentProps, []);

  const { orientation } = useToolbarRootContext();

  const state: ToolbarLink.State = {
    get orientation() {
      return orientation();
    },
  };

  return (
    <CompositeItem
      tag="a"
      render={renderProps.render}
      class={renderProps.class}
      metadata={TOOLBAR_LINK_METADATA}
      state={state}
      refs={[componentProps.ref as any]}
      props={[elementProps]}
    />
  );
}

export interface ToolbarLinkState {
  orientation: ToolbarRoot.Orientation;
}

export interface ToolbarLinkProps extends BaseUIComponentProps<'a', ToolbarLink.State> {}

export namespace ToolbarLink {
  export type State = ToolbarLinkState;
  export type Props = ToolbarLinkProps;
}
