import { splitComponentProps } from '../../solid-helpers';
import { styleDisableScrollbar } from '../../utils/styles';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { LIST_FUNCTIONAL_STYLES } from '../popup/utils';
import { useSelectPositionerContext } from '../positioner/SelectPositionerContext';
import { useSelectRootContext } from '../root/SelectRootContext';

/**
 * A container for the select items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectList(componentProps: SelectList.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { store, refs } = useSelectRootContext();
  const { alignItemWithTriggerActive } = useSelectPositionerContext();

  const hasScrollArrows = store.useState('hasScrollArrows');
  const openMethod = store.useState('openMethod');
  const multiple = store.useState('multiple');
  const id = store.useState('id');

  const defaultProps: HTMLProps = {
    get id() {
      return `${id()}-list`;
    },
    role: 'listbox',
    get 'aria-multiselectable'() {
      return multiple() || undefined;
    },
    onScroll(event) {
      refs.scrollHandlerRef?.(event.currentTarget);
    },
    get style() {
      if (alignItemWithTriggerActive()) {
        return LIST_FUNCTIONAL_STYLES;
      }
      return undefined;
    },
    get class() {
      return hasScrollArrows() && openMethod() !== 'touch'
        ? styleDisableScrollbar.class
        : undefined;
    },
  };

  const setListElement = (element: HTMLElement | null | undefined) => {
    store.set('listElement', element);
  };

  const element = useRenderElement('div', componentProps, {
    ref: setListElement,
    props: [defaultProps, elementProps],
  });

  return <>{element()}</>;
}

export interface SelectListProps extends BaseUIComponentProps<'div', SelectList.State> {}

export interface SelectListState {}

export namespace SelectList {
  export type Props = SelectListProps;
  export type State = SelectListState;
}
