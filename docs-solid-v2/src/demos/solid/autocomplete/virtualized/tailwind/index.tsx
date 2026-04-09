import { Show, createSignal, onCleanup } from 'solid-js';
import { Autocomplete } from '@msviderok/base-ui-solid/autocomplete';
import {
  createFixedVirtualizer,
  type FixedVirtualizerHandle,
} from '../../../_shared/useFixedVirtualizer';

export default function ExampleVirtualizedAutocomplete() {
  const [open, setOpen] = createSignal(false);
  let virtualizerRef: FixedVirtualizerHandle | null = null;

  return (
    <Autocomplete.Root
      virtualized
      items={virtualizedItems}
      open={open()}
      onOpenChange={setOpen}
      openOnInputClick
      itemToStringValue={getItemLabel}
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
        <Autocomplete.Input class="h-10 w-64 rounded-md font-normal border border-gray-200 pl-3.5 text-base text-gray-900 bg-[canvas] focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800 md:w-[20rem]" />
      </label>

      <Autocomplete.Portal>
        <Autocomplete.Positioner class="outline-none" sideOffset={4}>
          <Autocomplete.Popup class="w-[var(--anchor-width)] max-h-[min(22rem,var(--available-height))] max-w-[var(--available-width)] rounded-md bg-[canvas] text-gray-900 outline-1 outline-gray-200 shadow-lg shadow-gray-200 dark:-outline-offset-1 dark:outline-gray-300">
            <Autocomplete.Empty class="px-4 py-4 text-[0.925rem] leading-4 text-gray-600 empty:m-0 empty:p-0">
              No items found.
            </Autocomplete.Empty>
            <Autocomplete.List class="p-0">
              <VirtualizedList
                onVirtualizer={(virtualizer) => {
                  virtualizerRef = virtualizer;
                }}
              />
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}

function VirtualizedList(props: {
  onVirtualizer: (virtualizer: FixedVirtualizerHandle | null) => void;
}) {
  const filteredItems = Autocomplete.useFilteredItems<VirtualizedItem>();
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
              <Autocomplete.Item
                key={`${item.id}-${index}`}
                index={index}
                data-index={index}
                value={item}
                class="flex cursor-default py-2 pr-8 pl-4 text-base leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-2 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded data-[highlighted]:before:bg-gray-900"
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
                {item.name}
              </Autocomplete.Item>
            );
          })}
        </div>
      </div>
    </Show>
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
