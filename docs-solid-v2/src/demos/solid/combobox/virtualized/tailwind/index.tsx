import { Show, createSignal, onCleanup } from 'solid-js';
import type { JSX } from 'solid-js';
import { Combobox } from '@msviderok/base-ui-solid/combobox';
import {
  createFixedVirtualizer,
  type FixedVirtualizerHandle,
} from '../../../_shared/useFixedVirtualizer';

export default function ExampleVirtualizedCombobox() {
  const [open, setOpen] = createSignal(false);
  let virtualizerRef: FixedVirtualizerHandle | null = null;

  return (
    <Combobox.Root
      virtualized
      items={virtualizedItems}
      open={open()}
      onOpenChange={setOpen}
      itemToStringLabel={getItemLabel}
      onItemHighlighted={(item, { reason, index }) => {
        const virtualizer = virtualizerRef;

        if (!item || !virtualizer) {
          return;
        }

        const isStart = index === 0;
        const isEnd = index === virtualizer.options.count - 1;
        const shouldScroll = reason === 'none' || (reason === 'keyboard' && (isStart || isEnd));

        if (shouldScroll) {
          queueMicrotask(() => {
            virtualizer.scrollToIndex(index, { align: isEnd ? 'start' : 'end' });
          });
        }
      }}
    >
      <label class="flex flex-col gap-1 text-sm leading-5 font-medium text-gray-900">
        Search 10,000 items
        <Combobox.Input class="h-10 w-64 rounded-md font-normal border border-gray-200 pl-3.5 text-base text-gray-900 bg-[canvas] focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800" />
      </label>

      <Combobox.Portal>
        <Combobox.Positioner class="outline-none" sideOffset={4}>
          <Combobox.Popup class="w-[var(--anchor-width)] max-h-[min(22rem,var(--available-height))] max-w-[var(--available-width)] rounded-md bg-[canvas] text-gray-900 outline-1 outline-gray-200 shadow-lg shadow-gray-200 dark:-outline-offset-1 dark:outline-gray-300">
            <Combobox.Empty class="px-4 py-4 text-[0.925rem] leading-4 text-gray-600 empty:m-0 empty:p-0">
              No items found.
            </Combobox.Empty>
            <Combobox.List class="p-0">
              <VirtualizedList
                onVirtualizer={(virtualizer) => {
                  virtualizerRef = virtualizer;
                }}
              />
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function VirtualizedList(props: {
  onVirtualizer: (virtualizer: FixedVirtualizerHandle | null) => void;
}) {
  const filteredItems = Combobox.useFilteredItems<VirtualizedItem>();
  const {
    handleScroll,
    itemHeight,
    paddingStart,
    totalSize,
    visibleIndexes,
    virtualizer,
    setScrollElement,
  } = createFixedVirtualizer(filteredItems);

  props.onVirtualizer(virtualizer);
  onCleanup(() => props.onVirtualizer(null));

  return (
    <Show when={filteredItems().length > 0}>
      <div
        role="presentation"
        ref={setScrollElement}
        class="h-[min(22rem,var(--total-size))] max-h-[var(--available-height)] overflow-auto overscroll-contain scroll-p-2"
        onScroll={handleScroll}
        style={{ '--total-size': `${totalSize()}px` }}
      >
        <div role="presentation" class="relative w-full" style={{ height: totalSize() }}>
          {visibleIndexes().map((index) => {
            const item = filteredItems()[index];
            if (!item) {
              return null;
            }

            const top = paddingStart + index * itemHeight;

            return (
              <Combobox.Item
                key={`${item.id}-${index}`}
                index={index}
                data-index={index}
                value={item}
                class="grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-8 pl-4 text-base leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-2 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900"
                aria-setsize={filteredItems().length}
                aria-posinset={index + 1}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${itemHeight}px`,
                  transform: `translateY(${top}px)`,
                }}
              >
                <Combobox.ItemIndicator class="col-start-1">
                  <CheckIcon class="size-3" />
                </Combobox.ItemIndicator>
                <div class="col-start-2">{item.name}</div>
              </Combobox.Item>
            );
          })}
        </div>
      </div>
    </Show>
  );
}

function CheckIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" {...props}>
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  );
}

interface VirtualizedItem {
  id: string;
  name: string;
}

function getItemLabel(item: VirtualizedItem | null) {
  return item ? item.name : '';
}

const virtualizedItems: VirtualizedItem[] = Array.from({ length: 10000 }, (_, index) => {
  const id = String(index + 1);
  const indexLabel = id.padStart(4, '0');
  return { id, name: `Item ${indexLabel}` };
});
