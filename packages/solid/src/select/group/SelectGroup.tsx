import { createSignal } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { SelectGroupContext } from './SelectGroupContext';

/**
 * Groups related select items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectGroup(componentProps: SelectGroup.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const [labelId, setLabelId] = createSignal<string | undefined>();

  const contextValue: SelectGroupContext = { labelId, setLabelId };

  const element = useRenderElement('div', componentProps, {
    props: [
      {
        role: 'group',
        get 'aria-labelledby'() {
          return labelId();
        },
      },
      elementProps,
    ],
  });

  return (
    <SelectGroupContext.Provider value={contextValue}>{element()}</SelectGroupContext.Provider>
  );
}

export interface SelectGroupState {}
export interface SelectGroupProps extends BaseUIComponentProps<'div', SelectGroup.State> {}

export namespace SelectGroup {
  export type State = SelectGroupState;
  export type Props = SelectGroupProps;
}
