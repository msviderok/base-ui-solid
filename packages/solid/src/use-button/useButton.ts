import { error } from '@base-ui/utils/error';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { createEffect, on, splitProps, type ComponentProps, type JSX } from 'solid-js';
import { useCompositeRootContext } from '../composite/root/CompositeRootContext';
import { makeEventPreventable } from '../merge-props';
import { mergeProps } from '../merge-props/mergeProps';
import { access, callEventHandler, type MaybeAccessor } from '../solid-helpers';
import { HTMLProps } from '../utils/types';
import { useFocusableWhenDisabled } from '../utils/useFocusableWhenDisabled';

export function useButton(parameters: useButton.Parameters = {}): useButton.ReturnValue {
  const disabled = () => access(parameters.disabled) ?? false;
  const tabIndex = () => access(parameters.tabIndex) ?? 0;
  const isNativeButton = () => access(parameters.native) ?? true;
  const focusableWhenDisabled = () => access(parameters.focusableWhenDisabled);

  let elementRef: HTMLElement | null | undefined;

  const isCompositeItem = () => useCompositeRootContext(true) !== undefined;

  const isValidLink = () => {
    return Boolean(elementRef?.tagName === 'A' && (elementRef as HTMLAnchorElement)?.href);
  };

  const { props: focusableWhenDisabledProps } = useFocusableWhenDisabled({
    focusableWhenDisabled,
    disabled,
    composite: isCompositeItem,
    tabIndex,
    isNativeButton,
  });

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      if (!elementRef) {
        return;
      }

      const isButtonTag = elementRef.tagName === 'BUTTON';

      if (isNativeButton()) {
        if (!isButtonTag) {
          error(
            'A component that acts as a button expected a native <button> because the ' +
              '`nativeButton` prop is true. Rendering a non-<button> removes native button ' +
              'semantics, which can impact forms and accessibility. Use a real <button> in the ' +
              '`render` prop, or set `nativeButton` to `false`.',
          );
        }
      } else if (isButtonTag) {
        error(
          'A component that acts as a button expected a non-<button> because the `nativeButton` ' +
            'prop is false. Rendering a <button> keeps native behavior while Base UI applies ' +
            'non-native attributes and handlers, which can add unintended extra attributes (such ' +
            'as `role` or `aria-disabled`). Use a non-<button> in the `render` prop, or set ' +
            '`nativeButton` to `true`.',
        );
      }
    });
  }

  const updateDisabled = () => {
    if (!isButtonElement(elementRef)) {
      return;
    }

    if (
      isCompositeItem() &&
      disabled() &&
      focusableWhenDisabledProps().disabled === undefined &&
      elementRef.disabled
    ) {
      elementRef.disabled = false;
    }
  };

  // handles a disabled composite button rendering another button, e.g.
  // <Toolbar.Button disabled render={() => <Menu.Trigger />} />
  // the `disabled` prop needs to pass through 2 `useButton`s then finally
  // delete the `disabled` attribute from DOM
  createEffect(
    on([disabled, () => focusableWhenDisabledProps().disabled, isCompositeItem], () => {
      updateDisabled();
    }),
  );

  // TODO: fix typing in the whole function
  function getButtonProps(externalProps: GenericButtonProps = {}) {
    // Access event handlers directly instead of using splitProps, since externalProps
    // might be a proxy from combineProps and splitProps may not extract merged
    // callbacks correctly
    const externalOnClick = externalProps.onClick;
    const externalOnMouseDown = externalProps.onMouseDown;
    const externalOnKeyUp = externalProps.onKeyUp;
    const externalOnKeyDown = externalProps.onKeyDown;
    const externalOnPointerDown = externalProps.onPointerDown;

    const [, otherExternalProps] = splitProps(externalProps, [
      'onClick',
      'onMouseDown',
      'onKeyUp',
      'onKeyDown',
      'onPointerDown',
    ]);

    return mergeProps<'button'>(
      {
        get type() {
          return isNativeButton() ? 'button' : undefined;
        },
        onClick(event) {
          if (disabled()) {
            event.preventDefault();
            return;
          }
          callEventHandler(externalOnClick, event);
        },
        onMouseDown(event) {
          if (!disabled()) {
            callEventHandler(externalOnMouseDown, event);
          }
        },
        onKeyDown(event) {
          if (!disabled()) {
            makeEventPreventable(event);
            callEventHandler(externalOnKeyDown, event);
          }

          if ((event as any).baseUIHandlerPrevented) {
            return;
          }

          const shouldClick =
            event.target === event.currentTarget &&
            !isNativeButton() &&
            !isValidLink() &&
            !disabled();
          const isEnterKey = event.key === 'Enter';
          const isSpaceKey = event.key === ' ';

          // Keyboard accessibility for non interactive elements
          if (shouldClick) {
            if (isSpaceKey || isEnterKey) {
              event.preventDefault();
            }

            if (isEnterKey) {
              callEventHandler(externalOnClick, event as any);
            }
          }
        },
        onKeyUp(event) {
          // calling preventDefault in keyUp on a <button> will not dispatch a click event if Space is pressed
          // https://codesandbox.io/p/sandbox/button-keyup-preventdefault-dn7f0
          // Keyboard accessibility for non interactive elements
          if (!disabled()) {
            // TODO: fix typing
            makeEventPreventable(event as any);
            callEventHandler(externalOnKeyUp, event);
          }

          // TODO: fix typing
          if ((event as any).baseUIHandlerPrevented) {
            return;
          }

          if (
            event.target === event.currentTarget &&
            !isNativeButton() &&
            !disabled() &&
            event.key === ' '
          ) {
            // TODO: fix this
            callEventHandler(externalOnClick, event as any);
          }
        },
        onPointerDown(event) {
          if (disabled()) {
            event.preventDefault();
            return;
          }
          callEventHandler(externalOnPointerDown, event);
        },
      },
      focusableWhenDisabledProps(),
      otherExternalProps,
      {
        get role() {
          if (otherExternalProps.role) {
            return otherExternalProps.role;
          }
          return !isNativeButton() ? 'button' : undefined;
        },
      },
    );
  }

  return {
    getButtonProps,
    buttonRef: (value) => {
      elementRef = value;
      updateDisabled();
    },
  };
}

function isButtonElement(
  elem: HTMLButtonElement | HTMLAnchorElement | HTMLElement | null | undefined,
): elem is HTMLButtonElement {
  return isHTMLElement(elem) && elem.tagName === 'BUTTON';
}

interface GenericButtonProps extends HTMLProps, AdditionalButtonProps {
  tabIndex?: number | undefined;
}

interface AdditionalButtonProps extends Partial<{
  'aria-disabled': JSX.AriaAttributes['aria-disabled'];
  disabled: boolean;
  role: JSX.AriaAttributes['role'];
  tabIndex?: number | undefined;
}> {}

export interface UseButtonParameters {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: MaybeAccessor<boolean | undefined>;
  /**
   * Whether the button may receive focus even if it is disabled.
   * @default false
   */
  focusableWhenDisabled?: MaybeAccessor<boolean | undefined>;
  tabIndex?: MaybeAccessor<NonNullable<JSX.HTMLAttributes<any>['tabIndex']> | undefined>;
  /**
   * Whether the component is being rendered as a native button.
   * @default true
   */
  native?: MaybeAccessor<boolean | undefined>;
}

export interface UseButtonReturnValue {
  /**
   * Resolver for the button props.
   * @param externalProps additional props for the button
   * @returns props that should be spread on the button
   */
  getButtonProps: (externalProps?: ComponentProps<any>) => ComponentProps<any>;
  /**
   * A ref to the button DOM element. This ref should be passed to the rendered element.
   * It is not a part of the props returned by `getButtonProps`.
   */
  buttonRef: (
    value: HTMLButtonElement | HTMLAnchorElement | HTMLElement | null | undefined,
  ) => void;
}

export namespace useButton {
  export type Parameters = UseButtonParameters;
  export type ReturnValue = UseButtonReturnValue;
}
