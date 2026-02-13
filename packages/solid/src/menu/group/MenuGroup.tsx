import { createSignal, type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { MenuGroupContext } from './MenuGroupContext';

/**
 * Groups related menu items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuGroup(componentProps: MenuGroup.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const [labelId, setLabelId] = createSignal<string>();

  const context = { setLabelId };

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

  return <MenuGroupContext.Provider value={context}>{element()}</MenuGroupContext.Provider>;
}

export interface MenuGroupProps extends BaseUIComponentProps<'div', MenuGroup.State> {
  /**
   * The content of the component.
   */
  children?: JSX.Element;
}

export interface MenuGroupState {}

export namespace MenuGroup {
  export type Props = MenuGroupProps;
  export type State = MenuGroupState;
}
