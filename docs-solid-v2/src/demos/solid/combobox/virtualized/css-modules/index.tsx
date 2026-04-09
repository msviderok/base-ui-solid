import { Show, createSignal, onCleanup } from 'solid-js';
import type { JSX } from 'solid-js';
import { Combobox } from '@msviderok/base-ui-solid/combobox';
import {
  createFixedVirtualizer,
  type FixedVirtualizerHandle,
} from '../../../_shared/useFixedVirtualizer';
import styles from './index.module.css';

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
      <label class={styles.Label}>
        Search 10,000 items
        <Combobox.Input class={styles.Input} />
      </label>

      <Combobox.Portal>
        <Combobox.Positioner class={styles.Positioner} sideOffset={4}>
          <Combobox.Popup class={styles.Popup}>
            <Combobox.Empty class={styles.Empty}>No items found.</Combobox.Empty>
            <Combobox.List class={styles.List}>
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
              <Combobox.Item
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
                <Combobox.ItemIndicator class={styles.ItemIndicator}>
                  <CheckIcon class={styles.ItemIndicatorIcon} />
                </Combobox.ItemIndicator>
                <div class={styles.ItemText}>{item.name}</div>
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
