import { batch, Show } from 'solid-js';
import { CompositeItem } from '../composite/item/CompositeItem';
import { splitComponentProps } from '../solid-helpers';
import { useToggleGroupContext } from '../toggle-group/ToggleGroupContext';
import { useButton } from '../use-button/useButton';
import {
  type BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '../utils/createBaseUIEventDetails';
import { REASONS } from '../utils/reasons';
import type { BaseUIComponentProps, NativeButtonProps } from '../utils/types';
import { useBaseUiId } from '../utils/useBaseUiId';
import { useControlled } from '../utils/useControlled';
import { useRenderElement } from '../utils/useRenderElement';

/**
 * A two-state button that can be on or off.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toggle](https://base-ui.com/react/components/toggle)
 */
export function Toggle(componentProps: Toggle.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'defaultPressed',
    'disabled',
    'form', // never participates in form validation
    'onPressedChange',
    'pressed',
    'type', // cannot change button type
    'value',
    'nativeButton',
  ]);
  const defaultPressedProp = () => local.defaultPressed ?? false;
  const disabledProp = () => local.disabled ?? false;
  const pressedProp = () => local.pressed;
  const valueProp = () => local.value;
  const nativeButton = () => local.nativeButton ?? true;

  // `|| undefined` handles cases, where value is falsy (i.e. "")
  const value = useBaseUiId(() => valueProp() || undefined);

  const groupContext = useToggleGroupContext();
  const groupValue = () => groupContext?.value() ?? [];

  const defaultPressed = () => (groupContext ? undefined : defaultPressedProp());

  const disabled = () => (disabledProp() || groupContext?.disabled()) ?? false;

  const [pressed, setPressedState] = useControlled({
    controlled: () => (groupContext ? groupValue()?.indexOf(value()) > -1 : pressedProp()),
    default: defaultPressed,
    name: 'Toggle',
    state: 'pressed',
  });

  const onPressedChange = (nextPressed: boolean, eventDetails: Toggle.ChangeEventDetails) => {
    batch(() => {
      const val = value();
      if (val) {
        groupContext?.setGroupValue?.(val, nextPressed, eventDetails);
      }
      local.onPressedChange?.(nextPressed, eventDetails);
    });
  };

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const state: Toggle.State = {
    get disabled() {
      return disabled();
    },
    get pressed() {
      return pressed();
    },
  };

  const props = [
    {
      get 'aria-pressed'() {
        return pressed();
      },
      onClick(event: MouseEvent) {
        batch(() => {
          const nextPressed = !pressed();
          const details = createChangeEventDetails(REASONS.none, event);

          onPressedChange(nextPressed, details);

          if (details.isCanceled) {
            return;
          }

          setPressedState(nextPressed);
        });
      },
    },
    elementProps,
    getButtonProps,
  ];

  const element = useRenderElement('button', componentProps, {
    enabled: () => !groupContext,
    state,
    ref: buttonRef,
    props,
  });

  return (
    <Show when={groupContext} fallback={element()}>
      <CompositeItem
        tag="button"
        render={renderProps.render}
        class={renderProps.class}
        state={state}
        refs={[buttonRef, componentProps.ref as any]}
        props={props}
      />
    </Show>
  );
}

export interface ToggleState {
  /**
   * Whether the toggle is currently pressed.
   */
  pressed: boolean;
  /**
   * Whether the toggle should ignore user interaction.
   */
  disabled: boolean;
}

export interface ToggleProps
  extends NativeButtonProps, BaseUIComponentProps<'button', Toggle.State> {
  /**
   * Whether the toggle button is currently pressed.
   * This is the controlled counterpart of `defaultPressed`.
   */
  pressed?: boolean;
  /**
   * Whether the toggle button is currently pressed.
   * This is the uncontrolled counterpart of `pressed`.
   * @default false
   */
  defaultPressed?: boolean;
  /**
   * Callback fired when the pressed state is changed.
   *
   * @param {boolean} pressed The new pressed state.
   * @param {Event} event The corresponding event that initiated the change.
   */
  onPressedChange?: (pressed: boolean, eventDetails: Toggle.ChangeEventDetails) => void;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (e.g. `<div>`).
   * @default true
   */
  nativeButton?: boolean;
}

export type ToggleChangeEventReason = typeof REASONS.none;

export type ToggleChangeEventDetails = BaseUIChangeEventDetails<Toggle.ChangeEventReason>;

export namespace Toggle {
  export type State = ToggleState;
  export type Props = ToggleProps;
  export type ChangeEventReason = ToggleChangeEventReason;
  export type ChangeEventDetails = ToggleChangeEventDetails;
}
