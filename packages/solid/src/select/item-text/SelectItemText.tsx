import { createEffect, on } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useSelectItemContext } from '../item/SelectItemContext';
import { useSelectRootContext } from '../root/SelectRootContext';

/**
 * A text label of the select item.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectItemText(componentProps: SelectItemText.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);
  let localRef = null as HTMLElement | null | undefined;

  const { indexRef, textRef, selectedByFocus, hasRegistered } = useSelectItemContext();
  const { selectedItemTextRef } = useSelectRootContext();

  createEffect(
    on([selectedByFocus, hasRegistered], () => {
      const hasNoSelectedItemText =
        selectedItemTextRef.current === null || !selectedItemTextRef.current?.isConnected;
      if (selectedByFocus() || (hasNoSelectedItemText && indexRef.current === 0)) {
        selectedItemTextRef.current = localRef;
      }
    }),
  );

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      localRef = el;
      textRef.current = el;
    },
    props: elementProps,
  });

  return <>{element()}</>;
}

export interface SelectItemTextState {}

export interface SelectItemTextProps extends BaseUIComponentProps<'div', SelectItemText.State> {}

export namespace SelectItemText {
  export type State = SelectItemTextState;
  export type Props = SelectItemTextProps;
}
