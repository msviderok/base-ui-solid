import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { AccordionItem } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';

/**
 * A heading that labels the corresponding panel.
 * Renders an `<h3>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/solid/components/accordion)
 */
export function AccordionHeader(componentProps: AccordionHeader.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { state } = useAccordionItemContext();

  const element = useRenderElement('h3', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping: accordionStateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface AccordionHeaderProps extends BaseUIComponentProps<'h3', AccordionItem.State> {}
export namespace AccordionHeader {
  export type Props = AccordionHeaderProps;
}
