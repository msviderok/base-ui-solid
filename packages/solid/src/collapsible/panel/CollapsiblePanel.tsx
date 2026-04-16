import { createEffect, createMemo, onCleanup, onMount, Show } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { warn } from '../../utils/warn';
import type { CollapsibleRoot } from '../root/CollapsibleRoot';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import { collapsibleStateAttributesMapping } from '../root/stateAttributesMapping';
import { CollapsiblePanelCssVars } from './CollapsiblePanelCssVars';
import { useCollapsiblePanel } from './useCollapsiblePanel';

/**
 * A panel with the collapsible contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsiblePanel(componentProps: CollapsiblePanel.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'hiddenUntilFound',
    'keepMounted',
    'id',
  ]);
  const hiddenUntilFound = () => local.hiddenUntilFound ?? false;
  const keepMounted = () => local.keepMounted ?? false;

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      if (hiddenUntilFound() && keepMounted() === false) {
        warn(
          'The `keepMounted={false}` prop on a Collapsible will be ignored when using `hiddenUntilFound` since it requires the Panel to remain mounted even when closed.',
        );
      }
    });
  }

  const {
    animationTypeRef,
    height,
    setHiddenUntilFound,
    setKeepMounted,
    panelId,
    mounted,
    onOpenChange,
    open,
    panelRef,
    abortControllerRef,
    runOnceAnimationsFinish,
    setDimensions,
    setMounted,
    setPanelIdState,
    setOpen,
    setVisible,
    transitionDimensionRef,
    visible,
    width,
    state,
    transitionStatus,
  } = useCollapsibleRootContext();

  createEffect(() => {
    if (local.id) {
      setPanelIdState(local.id);
      onCleanup(() => setPanelIdState(undefined));
    }
  });

  createEffect(() => {
    setHiddenUntilFound(hiddenUntilFound());
  });

  createEffect(() => {
    setKeepMounted(keepMounted());
  });

  const { props, setRef } = useCollapsiblePanel({
    animationTypeRef,
    height,
    hiddenUntilFound,
    id: () => local.id ?? panelId(),
    keepMounted,
    mounted,
    onOpenChange,
    open,
    panelRef,
    abortControllerRef,
    runOnceAnimationsFinish,
    setDimensions,
    setMounted,
    setOpen,
    setVisible,
    transitionDimensionRef,
    visible,
    width,
  });

  onMount(() => {
    console.log('MOUNT');

    onCleanup(() => {
      console.log('UNMOUNT');
    });
  });

  useOpenChangeComplete({
    open: () => open() && transitionStatus() === 'idle',
    ref: () => panelRef.current,
    onComplete() {
      if (!open()) {
        return;
      }

      setDimensions({ height: undefined, width: undefined });
    },
  });

  const shouldRender = createMemo(
    () => keepMounted() || hiddenUntilFound() || (!keepMounted() && mounted()),
  );

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      panelRef.current = el;
      setRef(el);
    },
    props: [
      props,
      {
        get style() {
          return {
            [CollapsiblePanelCssVars.collapsiblePanelHeight as string]:
              height() === undefined ? 'auto' : `${height()}px`,
            [CollapsiblePanelCssVars.collapsiblePanelWidth as string]:
              width() === undefined ? 'auto' : `${width()}px`,
          };
        },
      },
      elementProps,
    ],
    stateAttributesMapping: collapsibleStateAttributesMapping,
  });

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface CollapsiblePanelState extends CollapsibleRoot.State {
  transitionStatus: TransitionStatus;
}

export interface CollapsiblePanelProps extends BaseUIComponentProps<'div', CollapsiblePanel.State> {
  /**
   * Allows the browser’s built-in page search to find and expand the panel contents.
   *
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   *
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is hidden.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace CollapsiblePanel {
  export type State = CollapsiblePanelState;
  export type Props = CollapsiblePanelProps;
}
