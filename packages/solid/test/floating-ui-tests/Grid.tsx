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
}

/** @internal */
export function Main(componentProps: Props) {
  const props = defaultProps(componentProps, {
    orientation: 'horizontal',
    loopFocus: false,
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

  const disabledIndices = [0, 1, 2, 3, 4, 5, 6, 7, 10, 15, 45, 48];

  const click = useClick({ context });
  const listNavigation = useListNavigation({
    context,
    props: {
      get listRef() {
        return listRef;
      },
      get activeIndex() {
        return activeIndex();
      },
      onNavigate: setActiveIndex,
      cols: 5,
      get orientation() {
        return props.orientation;
      },
      get loopFocus() {
        return props.loopFocus;
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
      <h1>Grid</h1>
      <div class="container">
        <button ref={refs.setReference} type="button" {...getReferenceProps()}>
          Reference
        </button>
        <Show when={open()}>
          <FloatingFocusManager context={context}>
            <div
              role="menu"
              ref={refs.setFloating}
              data-testid="floating"
              class="grid gap-2"
              style={{
                ...floatingStyles(),
                'grid-template-columns': '100px 100px 100px 100px 100px',
                'z-index': 999,
              }}
              {...getFloatingProps()}
            >
              <Index each={Array(49)}>
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
