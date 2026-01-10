import { createSignal, Index } from 'solid-js';
import {
  FloatingFocusManager,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
} from '../../src/floating-ui-solid';

interface Props {
  orientation?: 'horizontal' | 'both';
  loopFocus?: boolean;
}

/** @internal */
export function Main(props: Props) {
  const orientation = () => props.orientation ?? 'horizontal';
  const loopFocus = () => props.loopFocus ?? false;
  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);

  const listRef: Array<HTMLElement | null> = [];

  const { floatingStyles, refs, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
  });

  const disabledIndices = [0, 1, 2, 3, 4, 5, 6, 7, 10, 15, 45, 48];

  const click = useClick(context);
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    cols: 5,
    orientation,
    loopFocus,
    openOnArrowKeyDown: false,
    disabledIndices,
  });
  const dismiss = useDismiss(context);

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
        {open() && (
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
        )}
      </div>
    </>
  );
}
