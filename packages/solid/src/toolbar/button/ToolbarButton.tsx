import { CompositeItem } from '../../composite/item/CompositeItem';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import type { ToolbarRoot } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';

/**
 * A button that can be used as-is or as a trigger for other components.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarButton(componentProps: ToolbarButton.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'focusableWhenDisabled',
    'nativeButton',
    'children',
  ]);
  const disabledProp = () => local.disabled ?? false;
  const focusableWhenDisabled = () => local.focusableWhenDisabled ?? true;
  const nativeButton = () => local.nativeButton ?? true;

  const itemMetadata = { focusableWhenDisabled };

  const { disabled: toolbarDisabled, orientation } = useToolbarRootContext();

  const groupContext = useToolbarGroupContext(true);

  const disabled = () => toolbarDisabled() || (groupContext?.disabled() ?? false) || disabledProp();

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled,
    native: nativeButton,
  });

  const state: ToolbarButton.State = {
    get disabled() {
      return disabled();
    },
    get orientation() {
      return orientation();
    },
    get focusable() {
      return focusableWhenDisabled();
    },
  };

  return (
    <CompositeItem
      tag="button"
      render={renderProps.render}
      class={renderProps.class}
      metadata={itemMetadata}
      state={state}
      ref={componentProps.ref}
      refs={[buttonRef]}
      props={[
        elementProps,
        // for integrating with Menu and Select disabled states, `disabled` is
        // intentionally duplicated even though getButtonProps includes it already
        // TODO: follow up after https://github.com/mui/base-ui/issues/1976#issuecomment-2916905663
        {
          get disabled() {
            return disabled();
          },
        },
        getButtonProps,
      ]}
    >
      {local.children}
    </CompositeItem>
  );
}

export interface ToolbarButtonState extends ToolbarRoot.State {
  disabled: boolean;
  focusable: boolean;
}

export interface ToolbarButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToolbarButtonState> {
  /**
   * When `true` the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When `true` the item remains focuseable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
}

export namespace ToolbarButton {
  export type State = ToolbarButtonState;
  export type Props = ToolbarButtonProps;
}
