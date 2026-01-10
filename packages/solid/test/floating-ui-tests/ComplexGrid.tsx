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
  rtl?: boolean;
}

/*
 * Grid diagram for reference:
 * Disabled indices marked with ()
 *
 * (0)  (1)  (1)  (2)  (3)  (4)  (5)
 * (6)   7    8   (9)  10   11   12
 * 13  (14)  15   16   17   18   19
 * 20   20   21   21   21   21   21
 * 20   20   22  (23) (23) (23)  24
 * 25   26   27   28   29   29   30
 * 31   32   33   34   29   29  (35)
 * 36   36
 */

/** @internal */
export function Main(props: Props) {
  const orientation = () => props.orientation ?? 'horizontal';
  const loopFocus = () => props.loopFocus ?? false;
  const rtl = () => props.rtl ?? false;

  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);

  const listRef: Array<HTMLElement | null> = [];

  const { floatingStyles, refs, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: () => 'bottom-start',
  });

  const disabledIndices = [0, 1, 2, 3, 4, 5, 6, 9, 14, 23, 35];

  const itemSizes = Array.from(Array(37), () => ({ width: 1, height: 1 }));
  itemSizes[1].width = 2;
  itemSizes[20].width = 2;
  itemSizes[20].height = 2;
  itemSizes[21].width = 5;
  itemSizes[23].width = 3;
  itemSizes[29].width = 2;
  itemSizes[29].height = 2;
  itemSizes[36].width = 2;

  const click = useClick(context);
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    cols: 7,
    orientation,
    loopFocus,
    rtl,
    openOnArrowKeyDown: false,
    disabledIndices,
    itemSizes,
  });
  const dismiss = useDismiss(context);

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
        {open() && (
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
                    style={{
                      'grid-row': `span ${itemSizes[index].height}`,
                      'grid-column': `span ${itemSizes[index].width}`,
                    }}
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
