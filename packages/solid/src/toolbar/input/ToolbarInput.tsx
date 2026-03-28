import { type ComponentProps } from 'solid-js';
import { ARROW_LEFT, ARROW_RIGHT, stopEvent } from '../../composite/composite';
import { CompositeItem } from '../../composite/item/CompositeItem';
import { mergeProps } from '../../merge-props/mergeProps';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useFocusableWhenDisabled } from '../../utils/useFocusableWhenDisabled';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import type { ToolbarRoot } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';

/**
 * A native input element that integrates with Toolbar keyboard navigation.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarInput(componentProps: ToolbarInput.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'focusableWhenDisabled',
    'disabled',
    'defaultValue',
    'value',
    'children',
  ]);
  const focusableWhenDisabled = () => local.focusableWhenDisabled ?? true;
  const disabledProp = () => local.disabled ?? false;

  const itemMetadata = { focusableWhenDisabled };

  const { disabled: toolbarDisabled, orientation } = useToolbarRootContext();

  const groupContext = useToolbarGroupContext(true);

  const disabled = () => toolbarDisabled() || (groupContext?.disabled() ?? false) || disabledProp();

  const { props: focusableWhenDisabledProps } = useFocusableWhenDisabled({
    composite: true,
    disabled,
    focusableWhenDisabled,
    isNativeButton: false,
  });

  const state: ToolbarInput.State = {
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

  const defaultProps: Omit<ComponentProps<'input'>, 'children'> = {
    get value() {
      return local.value ?? local.defaultValue;
    },
    onClick(event) {
      if (disabled()) {
        event.preventDefault();
      }
    },
    onKeyDown(event) {
      if (event.key !== ARROW_LEFT && event.key !== ARROW_RIGHT && disabled()) {
        stopEvent(event);
      }
    },
    onPointerDown(event) {
      if (disabled()) {
        event.preventDefault();
      }
    },
  };

  return (
    <CompositeItem
      tag="input"
      render={renderProps.render}
      class={renderProps.class}
      metadata={itemMetadata}
      state={state}
      ref={componentProps.ref}
      props={[defaultProps, elementProps, focusableWhenDisabledProps()]}
    >
      {local.children}
    </CompositeItem>
  );
}

export interface ToolbarInputState extends ToolbarRoot.State {
  disabled: boolean;
  focusable: boolean;
}

export interface ToolbarInputProps extends BaseUIComponentProps<'input', ToolbarInput.State> {
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
  defaultValue?: ComponentProps<'input'>['value'] | undefined;
}

export namespace ToolbarInput {
  export type State = ToolbarInputState;
  export type Props = ToolbarInputProps;
}
