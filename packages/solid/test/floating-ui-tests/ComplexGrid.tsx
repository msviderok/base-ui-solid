import { createSignal, Index, Show } from 'solid-js';
import {
  FloatingFocusManager,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
} from '../../src/floating-ui-solid';
import { defaultProps } from '../../src/solid-helpers';

interface Props {
  orientation?: 'horizontal' | 'both';
  loopFocus?: boolean;
  rtl?: boolean;
}

/*
 * Grid diagram for reference:
 * Disabled indices marked with ()
 */

/** @internal */
export function Main(componentProps: Props) {
  const props = defaultProps(componentProps, {
    orientation: 'horizontal',
    loopFocus: false,
    rtl: false,
  });

  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);

  const listRef: Array<HTMLElement | null> = [];

  const { floatingStyles, refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
    placement: 'bottom-start',
  });

  const disabledIndices = [0, 1, 2, 3, 4, 5, 6, 9, 14, 23, 35];

  const click = useClick({ context });
  const listNavigation = useListNavigation({
    context,
    props: {
      listRef,
      get activeIndex() {
        return activeIndex();
      },
      onNavigate: setActiveIndex,
      cols: 7,
      get orientation() {
        return props.orientation;
      },
      get loopFocus() {
        return props.loopFocus;
      },
      get rtl() {
        return props.rtl;
      },
      openOnArrowKeyDown: false,
      disabledIndices,
    },
  });
  const dismiss = useDismiss({ context });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    listNavigation,
    dismiss,
  ]);

  return (
    <>
      <h1>Complex Grid</h1>
      <div class="container">
        <button ref={refs.setReference} type="button" {...getReferenceProps()}>
          Reference
        </button>
        <Show when={open()}>
          <FloatingFocusManager context={context}>
            <div
              ref={refs.setFloating}
              data-testid="floating"
              class="grid gap-2"
              style={{
                ...floatingStyles(),
                display: 'grid',
                'grid-template-columns': '100px 100px 100px 100px 100px 100px 100px',
                'z-index': 999,
              }}
              {...getFloatingProps()}
            >
              <Index each={Array(37)}>
                {(_, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={activeIndex() === index}
                    tabIndex={activeIndex() === index ? 0 : -1}
                    disabled={disabledIndices.includes(index)}
                    ref={(node) => {
                      listRef[index] = node;
                    }}
                    class="border border-black disabled:opacity-20"
                    {...getItemProps()}
                  >
                    Item {index}
                  </button>
                )}
              </Index>
            </div>
          </FloatingFocusManager>
        </Show>
      </div>
    </>
  );
}
