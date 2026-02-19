import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { ToolbarRoot } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { ToolbarGroupContext } from './ToolbarGroupContext';

/**
 * Groups several toolbar items or toggles.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarGroup(componentProps: ToolbarGroup.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled']);
  const disabledProp = () => local.disabled ?? false;

  const { orientation, disabled: toolbarDisabled } = useToolbarRootContext();

  const disabled = () => toolbarDisabled() || disabledProp();

  const contextValue: ToolbarGroupContext = {
    disabled,
  };

  const state: ToolbarRoot.State = {
    get disabled() {
      return disabled();
    },
    get orientation() {
      return orientation();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: [{ role: 'group' }, elementProps],
  });

  return (
    <ToolbarGroupContext.Provider value={contextValue}>{element()}</ToolbarGroupContext.Provider>
  );
}

export interface ToolbarGroupProps extends BaseUIComponentProps<'div', ToolbarRoot.State> {
  /**
   * When `true` all toolbar items in the group are disabled.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ToolbarGroup {
  export type Props = ToolbarGroupProps;
}
