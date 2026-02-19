import { createEffect, type JSX, onCleanup, Show } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { Side } from '../../utils/useAnchorPositioning';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { type TransitionStatus, useTransitionStatus } from '../../utils/useTransitionStatus';
import { useSelectPositionerContext } from '../positioner/SelectPositionerContext';
import { useSelectRootContext } from '../root/SelectRootContext';

/**
 * @internal
 */
export function SelectScrollArrow(componentProps: SelectScrollArrow.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['direction', 'keepMounted']);
  const keepMounted = () => componentProps.keepMounted ?? false;

  const { store, refs: rootRefs, handleScrollArrowVisibility } = useSelectRootContext();
  const { side, refs: positionerRefs } = useSelectPositionerContext();

  const stateVisible = () =>
    local.direction === 'up'
      ? store.useState('scrollUpArrowVisible')()
      : store.useState('scrollDownArrowVisible')();
  const openMethod = store.useState('openMethod');

  // Scroll arrows are disabled for touch modality as they are a hover-only element.
  const visible = () => stateVisible() && openMethod() !== 'touch';

  const timeout = useTimeout();

  const scrollArrowRef = () =>
    local.direction === 'up' ? positionerRefs.scrollUpArrowRef : positionerRefs.scrollDownArrowRef;

  const { transitionStatus, setMounted } = useTransitionStatus(visible);

  createEffect(() => {
    rootRefs.scrollArrowsMountedCountRef += 1;
    if (!store.state.hasScrollArrows) {
      store.set('hasScrollArrows', true);
    }

    onCleanup(() => {
      rootRefs.scrollArrowsMountedCountRef = Math.max(0, rootRefs.scrollArrowsMountedCountRef - 1);
      if (rootRefs.scrollArrowsMountedCountRef === 0 && store.state.hasScrollArrows) {
        store.set('hasScrollArrows', false);
      }
    });
  });

  useOpenChangeComplete({
    open: visible,
    ref: scrollArrowRef,
    onComplete() {
      if (!visible()) {
        setMounted(false);
      }
    },
  });

  const state: SelectScrollArrow.State = {
    get direction() {
      return local.direction;
    },
    get visible() {
      return visible();
    },
    get side() {
      return side();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  const defaultProps: JSX.HTMLAttributes<HTMLDivElement> = {
    'aria-hidden': true,
    get children() {
      return <>{local.direction === 'up' ? '▲' : '▼'}</>;
    },
    style: {
      position: 'absolute',
    },
    onMouseMove(event) {
      if ((event.movementX === 0 && event.movementY === 0) || timeout.isStarted()) {
        return;
      }

      store.set('activeIndex', null);

      function scrollNextItem() {
        const scroller = store.state.listElement ?? rootRefs.popupRef;
        if (!scroller) {
          return;
        }

        store.set('activeIndex', null);
        handleScrollArrowVisibility();

        const isScrolledToTop = scroller.scrollTop === 0;
        const isScrolledToBottom =
          Math.round(scroller.scrollTop + scroller.clientHeight) >= scroller.scrollHeight;

        const list = rootRefs.listRef;

        if (list.length === 0) {
          if (local.direction === 'up') {
            store.set('scrollUpArrowVisible', !isScrolledToTop);
          } else if (local.direction === 'down') {
            store.set('scrollDownArrowVisible', !isScrolledToBottom);
          }
        }

        if (
          (local.direction === 'up' && isScrolledToTop) ||
          (local.direction === 'down' && isScrolledToBottom)
        ) {
          timeout.clear();
          return;
        }

        if (store.state.listElement && rootRefs.listRef && rootRefs.listRef.length > 0) {
          const items = rootRefs.listRef;
          const scrollArrowHeight = scrollArrowRef()?.offsetHeight || 0;

          if (local.direction === 'up') {
            let firstVisibleIndex = 0;
            const scrollTop = scroller.scrollTop + scrollArrowHeight;

            for (let i = 0; i < items.length; i += 1) {
              const item = items[i];
              if (item) {
                const itemTop = item.offsetTop;
                if (itemTop >= scrollTop) {
                  firstVisibleIndex = i;
                  break;
                }
              }
            }

            const targetIndex = Math.max(0, firstVisibleIndex - 1);
            if (targetIndex < firstVisibleIndex) {
              const targetItem = items[targetIndex];
              if (targetItem) {
                scroller.scrollTop = Math.max(0, targetItem.offsetTop - scrollArrowHeight);
              } else {
                // Already at the first item; ensure we reach the absolute top to account for group labels.
                scroller.scrollTop = 0;
              }
            }
          } else {
            let lastVisibleIndex = items.length - 1;
            const scrollBottom = scroller.scrollTop + scroller.clientHeight - scrollArrowHeight;

            for (let i = 0; i < items.length; i += 1) {
              const item = items[i];
              if (item) {
                const itemBottom = item.offsetTop + item.offsetHeight;
                if (itemBottom > scrollBottom) {
                  lastVisibleIndex = Math.max(0, i - 1);
                  break;
                }
              }
            }

            const targetIndex = Math.min(items.length - 1, lastVisibleIndex + 1);
            if (targetIndex > lastVisibleIndex) {
              const targetItem = items[targetIndex];
              if (targetItem) {
                scroller.scrollTop =
                  targetItem.offsetTop +
                  targetItem.offsetHeight -
                  scroller.clientHeight +
                  scrollArrowHeight;
              }
            } else {
              // Already at the last item; ensure we reach the true bottom.
              scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
            }
          }
        }

        timeout.start(40, scrollNextItem);
      }

      timeout.start(40, scrollNextItem);
    },
    onMouseLeave() {
      timeout.clear();
    },
  };

  const shouldRender = () => visible() || keepMounted();

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      if (local.direction === 'up') {
        positionerRefs.scrollUpArrowRef = el;
      } else {
        positionerRefs.scrollDownArrowRef = el;
      }
    },
    props: [defaultProps, elementProps],
  });

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface SelectScrollArrowState {
  direction: 'up' | 'down';
  visible: boolean;
  side: Side | 'none';
  transitionStatus: TransitionStatus;
}

export interface SelectScrollArrowProps extends BaseUIComponentProps<
  'div',
  SelectScrollArrow.State
> {
  direction: 'up' | 'down';
  /**
   * Whether to keep the HTML element in the DOM while the select popup is not scrollable.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace SelectScrollArrow {
  export type State = SelectScrollArrowState;
  export type Props = SelectScrollArrowProps;
}
