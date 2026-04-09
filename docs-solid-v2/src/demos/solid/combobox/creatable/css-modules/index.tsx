import { Combobox } from '@msviderok/base-ui-solid/combobox';
import { Dialog } from '@msviderok/base-ui-solid/dialog';
import type { JSX } from 'solid-js';
import { createMemo, createSignal, createUniqueId } from 'solid-js';
import styles from './index.module.css';

export default function ExampleCreatableCombobox() {
  const id = createUniqueId();

  const [labels, setLabels] = createSignal<LabelItem[]>(initialLabels);
  const [selected, setSelected] = createSignal<LabelItem[]>([]);
  const [query, setQuery] = createSignal('');
  const [openDialog, setOpenDialog] = createSignal(false);

  let containerRef: HTMLDivElement | null = null;
  let createInputRef: HTMLInputElement | null = null;
  let comboboxInputRef: HTMLInputElement | null = null;
  let pendingQueryRef = '';
  let highlightedItemRef: LabelItem | undefined = undefined;

  function handleInputKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || highlightedItemRef) {
      return;
    }

    const currentTrimmed = query().trim();
    if (currentTrimmed === '') {
      return;
    }

    const normalized = currentTrimmed.toLocaleLowerCase();
    const existing = labels().find(
      (label) => label.value.trim().toLocaleLowerCase() === normalized,
    );

    if (existing) {
      setSelected((prev) =>
        prev.some((item) => item.id === existing.id) ? prev : [...prev, existing],
      );
      setQuery('');
      return;
    }

    pendingQueryRef = currentTrimmed;
    setOpenDialog(true);
  }

  function handleCreate() {
    const input = createInputRef || comboboxInputRef;
    const value = input ? input.value.trim() : '';
    if (!value) {
      return;
    }

    const normalized = value.toLocaleLowerCase();
    const baseId = normalized.replace(/\s+/g, '-');
    const existing = labels().find((l) => l.value.trim().toLocaleLowerCase() === normalized);

    if (existing) {
      setSelected((prev) => (prev.some((i) => i.id === existing.id) ? prev : [...prev, existing]));
      setOpenDialog(false);
      setQuery('');
      return;
    }

    // Ensure we don't collide with an existing id (e.g., value "docs" vs. existing id "docs")
    const existingIds = new Set(labels().map((l) => l.id));
    let uniqueId = baseId;
    if (existingIds.has(uniqueId)) {
      let i = 2;
      while (existingIds.has(`${baseId}-${i}`)) {
        i += 1;
      }
      uniqueId = `${baseId}-${i}`;
    }

    const newItem: LabelItem = { id: uniqueId, value };

    if (!selected().find((item) => item.id === newItem.id)) {
      setLabels((prev) => [...prev, newItem]);
      setSelected((prev) => [...prev, newItem]);
    }

    setOpenDialog(false);
    setQuery('');
  }

  function handleCreateSubmit(event: SubmitEvent) {
    event.preventDefault();
    handleCreate();
  }

  const trimmed = createMemo(() => query().trim());
  const lowered = createMemo(() => trimmed().toLocaleLowerCase());
  const exactExists = createMemo(() =>
    labels().some((l) => l.value.trim().toLocaleLowerCase() === lowered()),
  );
  // Show the creatable item alongside matches if there's no exact match
  const itemsForView = createMemo<Array<LabelItem>>(() =>
    trimmed() !== '' && !exactExists()
      ? [
          ...labels(),
          { creatable: trimmed(), id: `create:${lowered()}`, value: `Create "${trimmed()}"` },
        ]
      : labels(),
  );

  return (
    <>
      <Combobox.Root
        items={itemsForView()}
        multiple
        onValueChange={(next) => {
          const creatableSelection = next.find(
            (item) => item.creatable && !selected().some((current) => current.id === item.id),
          );

          if (creatableSelection && creatableSelection.creatable) {
            pendingQueryRef = creatableSelection.creatable;
            setOpenDialog(true);
            return;
          }
          const clean = next.filter((i) => !i.creatable);
          setSelected(clean);
          setQuery('');
        }}
        value={selected()}
        inputValue={query()}
        onInputValueChange={setQuery}
        onItemHighlighted={(item) => {
          highlightedItemRef = item;
        }}
      >
        <div class={styles.Container}>
          <label class={styles.Label} htmlFor={id}>
            Labels
          </label>
          <Combobox.Chips class={styles.Chips} ref={containerRef}>
            <Combobox.Value>
              {(value: LabelItem[]) => (
                <>
                  {value.map((label) => (
                    <Combobox.Chip key={label.id} class={styles.Chip} aria-label={label.value}>
                      {label.value}
                      <Combobox.ChipRemove class={styles.ChipRemove} aria-label="Remove">
                        <XIcon />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  ))}
                  <Combobox.Input
                    ref={comboboxInputRef}
                    id={id}
                    placeholder={value.length > 0 ? '' : 'e.g. bug'}
                    class={styles.Input}
                    onKeyDown={handleInputKeyDown}
                  />
                </>
              )}
            </Combobox.Value>
          </Combobox.Chips>
        </div>

        <Combobox.Portal>
          <Combobox.Positioner class={styles.Positioner} sideOffset={4} anchor={containerRef}>
            <Combobox.Popup class={styles.Popup}>
              <Combobox.Empty class={styles.Empty}>No labels found.</Combobox.Empty>
              <Combobox.List>
                {(item: LabelItem) =>
                  item.creatable ? (
                    <Combobox.Item key={item.id} class={styles.Item} value={item}>
                      <span class={styles.ItemIndicator}>
                        <PlusIcon class={styles.CreateIcon} />
                      </span>
                      <div class={styles.ItemText}>Create "{item.creatable}"</div>
                    </Combobox.Item>
                  ) : (
                    <Combobox.Item key={item.id} class={styles.Item} value={item}>
                      <Combobox.ItemIndicator class={styles.ItemIndicator}>
                        <CheckIcon class={styles.ItemIndicatorIcon} />
                      </Combobox.ItemIndicator>
                      <div class={styles.ItemText}>{item.value}</div>
                    </Combobox.Item>
                  )
                }
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <Dialog.Root open={openDialog()} onOpenChange={setOpenDialog}>
        <Dialog.Portal>
          <Dialog.Backdrop class={styles.Backdrop} />
          <Dialog.Popup class={styles.DialogPopup} initialFocus={createInputRef}>
            <Dialog.Title class={styles.Title}>Create new label</Dialog.Title>
            <Dialog.Description class={styles.Description}>
              Add a new label to select.
            </Dialog.Description>
            <form onSubmit={handleCreateSubmit}>
              <input
                ref={createInputRef}
                class={styles.TextField}
                placeholder="Label name"
                defaultValue={pendingQueryRef}
              />
              <div class={styles.Actions}>
                <Dialog.Close class={styles.Button}>Cancel</Dialog.Close>
                <button type="submit" class={styles.Button}>
                  Create
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function CheckIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" {...props}>
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  );
}

function PlusIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="butt"
      stroke-linejoin="miter"
      aria-hidden
      {...props}
    >
      <path d="M6 1v10M1 6h10" />
    </svg>
  );
}

function XIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

interface LabelItem {
  creatable?: string;
  id: string;
  value: string;
}

const initialLabels: LabelItem[] = [
  { id: 'bug', value: 'bug' },
  { id: 'docs', value: 'documentation' },
  { id: 'enhancement', value: 'enhancement' },
  { id: 'help-wanted', value: 'help wanted' },
  { id: 'good-first-issue', value: 'good first issue' },
];
