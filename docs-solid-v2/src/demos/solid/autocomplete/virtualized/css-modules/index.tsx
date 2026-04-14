import {
  createFixedVirtualizer,
  type FixedVirtualizerHandle,
} from '@/demos/solid/_shared/useFixedVirtualizer';
import { Autocomplete } from '@msviderok/base-ui-solid/autocomplete';
import { Show, createSignal, onCleanup } from 'solid-js';
import styles from './index.module.css';

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
      <label class={styles.Label}>
        Search 10,000 items
        <Autocomplete.Input class={styles.Input} />
      </label>

      <Autocomplete.Portal>
        <Autocomplete.Positioner class={styles.Positioner} sideOffset={4}>
          <Autocomplete.Popup class={styles.Popup}>
            <Autocomplete.Empty class={styles.Empty}>No items found.</Autocomplete.Empty>
            <Autocomplete.List class={styles.List}>
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
        class={styles.Scroller}
        onScroll={handleScroll}
        style={{ '--total-size': `${totalSize()}px` }}
      >
        <div
          role="presentation"
          class={styles.VirtualizedPlaceholder}
          style={{ height: totalSize() }}
        >
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
                class={styles.Item}
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
