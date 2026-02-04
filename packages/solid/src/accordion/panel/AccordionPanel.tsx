import { warn } from '@base-ui/utils/warn';
import { createEffect, Show, mergeProps as solidMergeProps } from 'solid-js';
import { useCollapsiblePanel } from '../../collapsible/panel/useCollapsiblePanel';
import { useCollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import type { AccordionItem } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';
import type { AccordionRoot } from '../root/AccordionRoot';
import { useAccordionRootContext } from '../root/AccordionRootContext';
import { AccordionPanelCssVars } from './AccordionPanelCssVars';

/**
 * A collapsible panel with the accordion item contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionPanel(componentProps: AccordionPanel.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'hiddenUntilFound',
    'keepMounted',
    'id',
  ]);

  const { hiddenUntilFound: contextHiddenUntilFound, keepMounted: contextKeepMounted } =
    useAccordionRootContext();

  const hiddenUntilFound = () => local.hiddenUntilFound ?? contextHiddenUntilFound();
  const keepMounted = () => local.keepMounted ?? contextKeepMounted();

  const {
    animationType,
    setAnimationType,
    height,
    mounted,
    onOpenChange,
    open,
    panelId,
    refs,
    runOnceAnimationsFinish,
    setDimensions,
    setHiddenUntilFound,
    setKeepMounted,
    setMounted,
    setOpen,
    setVisible,
    transitionDimension,
    setTransitionDimension,
    visible,
    width,
    transitionStatus,
  } = useCollapsibleRootContext();

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      if (keepMounted() === false && hiddenUntilFound()) {
        warn(
          'The `keepMounted={false}` prop on a Accordion.Panel will be ignored when using `contextHiddenUntilFound` on the Panel or the Root since it requires the panel to remain mounted when closed.',
        );
      }
    });
  }

  createEffect(() => {
    setHiddenUntilFound(hiddenUntilFound());
  });

  createEffect(() => {
    setKeepMounted(keepMounted());
  });

  useOpenChangeComplete({
    open: () => open() && transitionStatus() === 'idle',
    ref: () => refs.panelRef,
    onComplete() {
      if (!open()) {
        return;
      }

      setDimensions({ width: undefined, height: undefined });
    },
  });

  const panel = useCollapsiblePanel({
    animationType,
    setAnimationType,
    height,
    hiddenUntilFound,
    id: () => local.id ?? panelId(),
    keepMounted,
    mounted,
    onOpenChange,
    open,
    refs,
    runOnceAnimationsFinish,
    setDimensions,
    setMounted,
    setOpen,
    setVisible,
    transitionDimension,
    setTransitionDimension,
    visible,
    width,
  });

  const { state, triggerId } = useAccordionItemContext();

  const panelState = solidMergeProps(state, {
    get transitionStatus() {
      return transitionStatus();
    },
  });

  const element = useRenderElement('div', componentProps, {
    state: panelState,
    ref: (el) => {
      refs.panelRef = el;
      panel.ref(el);
    },
    props: [
      panel.props,
      {
        get 'aria-labelledby'() {
          return triggerId?.();
        },
        get role() {
          return 'region' as const;
        },
        get style() {
          return {
            [AccordionPanelCssVars.accordionPanelHeight as string]:
              height() === undefined ? 'auto' : `${height()}px`,
            [AccordionPanelCssVars.accordionPanelWidth as string]:
              width() === undefined ? 'auto' : `${width()}px`,
          };
        },
      },
      elementProps,
    ],
    stateAttributesMapping: accordionStateAttributesMapping,
  });

  const shouldRender = () => keepMounted() || hiddenUntilFound() || (!keepMounted() && mounted());

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface AccordionPanelState extends AccordionItem.State {
  transitionStatus: TransitionStatus;
}

export interface AccordionPanelProps
  extends
    BaseUIComponentProps<'div', AccordionPanel.State>,
    Pick<AccordionRoot.Props, 'hiddenUntilFound' | 'keepMounted'> {}

export namespace AccordionPanel {
  export type State = AccordionPanelState;
  export type Props = AccordionPanelProps;
}
