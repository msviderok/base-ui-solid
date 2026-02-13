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

  const { selectedByFocus, hasRegistered, refs: itemRefs } = useSelectItemContext();
  const { refs: rootRefs } = useSelectRootContext();

  createEffect(
    on([selectedByFocus, hasRegistered], () => {
      const hasNoSelectedItemText =
        rootRefs.selectedItemTextRef === null || !rootRefs.selectedItemTextRef?.isConnected;
      if (selectedByFocus() || (hasNoSelectedItemText && itemRefs.indexRef === 0)) {
        rootRefs.selectedItemTextRef = localRef;
      }
    }),
  );

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      localRef = el;
      itemRefs.textRef = el;
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
