import { Combobox } from '@msviderok/base-ui-solid/combobox';
import { Dialog } from '@msviderok/base-ui-solid/dialog';
import type { JSX } from 'solid-js';
import { createMemo, createSignal, createUniqueId } from 'solid-js';

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
        <div class="max-w-112 flex flex-col gap-1">
          <label class="text-sm leading-5 font-medium text-gray-900" htmlFor={id}>
            Labels
          </label>
          <Combobox.Chips
            class="flex flex-wrap items-center gap-0.5 rounded-md border border-gray-200 px-1.5 py-1 w-64 focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue-800 min-[500px]:w-[22rem]"
            ref={containerRef}
          >
            <Combobox.Value>
              {(value: LabelItem[]) => (
                <>
                  {value.map((label) => (
                    <Combobox.Chip
                      key={label.id}
                      class="flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-[0.2rem] text-sm text-gray-900 outline-none cursor-default [@media(hover:hover)]:[&[data-highlighted]]:bg-blue-800 [@media(hover:hover)]:[&[data-highlighted]]:text-gray-50 focus-within:bg-blue-800 focus-within:text-gray-50"
                      aria-label={label.value}
                    >
                      {label.value}
                      <Combobox.ChipRemove
                        class="rounded-md p-1 text-inherit hover:bg-gray-200"
                        aria-label="Remove"
                      >
                        <XIcon />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  ))}
                  <Combobox.Input
                    ref={comboboxInputRef}
                    id={id}
                    placeholder={value.length > 0 ? '' : 'e.g. bug'}
                    class="min-w-12 flex-1 h-8 rounded-md border-0 bg-transparent pl-2 text-base text-gray-900 outline-none"
                    onKeyDown={handleInputKeyDown}
                  />
                </>
              )}
            </Combobox.Value>
          </Combobox.Chips>
        </div>

        <Combobox.Portal>
          <Combobox.Positioner class="z-50 outline-none" sideOffset={4} anchor={containerRef}>
            <Combobox.Popup class="w-[var(--anchor-width)] max-h-[min(var(--available-height),24rem)] max-w-[var(--available-width)] overflow-y-auto scroll-pt-2 scroll-pb-2 overscroll-contain rounded-lg bg-[canvas] py-2 text-gray-900 shadow-lg shadow-gray-200 outline-1 outline-gray-200 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300">
              <Combobox.Empty class="px-4 py-2 text-[0.925rem] leading-4 text-gray-600 empty:m-0 empty:p-0">
                No labels found.
              </Combobox.Empty>
              <Combobox.List>
                {(item: LabelItem) =>
                  item.creatable ? (
                    <Combobox.Item
                      key={item.id}
                      class="grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-8 pl-4 text-base leading-4 outline-none select-none [@media(hover:hover)]:[&[data-highlighted]]:relative [@media(hover:hover)]:[&[data-highlighted]]:z-0 [@media(hover:hover)]:[&[data-highlighted]]:text-gray-50 [@media(hover:hover)]:[&[data-highlighted]]:before:absolute [@media(hover:hover)]:[&[data-highlighted]]:before:inset-x-2 [@media(hover:hover)]:[&[data-highlighted]]:before:inset-y-0 [@media(hover:hover)]:[&[data-highlighted]]:before:z-[-1] [@media(hover:hover)]:[&[data-highlighted]]:before:rounded-sm [@media(hover:hover)]:[&[data-highlighted]]:before:bg-gray-900"
                      value={item}
                    >
                      <span class="col-start-1">
                        <PlusIcon class="size-3" />
                      </span>
                      <div class="col-start-2">Create "{item.creatable}"</div>
                    </Combobox.Item>
                  ) : (
                    <Combobox.Item
                      key={item.id}
                      class="grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-8 pl-4 text-base leading-4 outline-none select-none [@media(hover:hover)]:[&[data-highlighted]]:relative [@media(hover:hover)]:[&[data-highlighted]]:z-0 [@media(hover:hover)]:[&[data-highlighted]]:text-gray-50 [@media(hover:hover)]:[&[data-highlighted]]:before:absolute [@media(hover:hover)]:[&[data-highlighted]]:before:inset-x-2 [@media(hover:hover)]:[&[data-highlighted]]:before:inset-y-0 [@media(hover:hover)]:[&[data-highlighted]]:before:z-[-1] [@media(hover:hover)]:[&[data-highlighted]]:before:rounded-sm [@media(hover:hover)]:[&[data-highlighted]]:before:bg-gray-900"
                      value={item}
                    >
                      <Combobox.ItemIndicator class="col-start-1">
                        <CheckIcon class="size-3" />
                      </Combobox.ItemIndicator>
                      <div class="col-start-2">{item.value}</div>
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
          <Dialog.Backdrop class="fixed inset-0 min-h-dvh bg-black opacity-20 transition-opacity dark:opacity-70 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
          <Dialog.Popup
            class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-2rem] w-[24rem] max-w-[calc(100vw-3rem)] rounded-lg bg-[canvas] p-6 text-gray-900 outline-1 outline-gray-200 transition-all data-[starting-style]:opacity-0 data-[starting-style]:scale-90 data-[ending-style]:opacity-0 data-[ending-style]:scale-90 dark:-outline-offset-1 dark:outline-gray-300"
            initialFocus={createInputRef}
          >
            <Dialog.Title class="-mt-1.5 mb-1 text-lg leading-7 tracking-[-0.0025em] font-medium">
              Create new label
            </Dialog.Title>
            <Dialog.Description class="mb-4 text-base leading-6 text-gray-600">
              Add a new label to select.
            </Dialog.Description>
            <form onSubmit={handleCreateSubmit}>
              <input
                ref={createInputRef}
                class="w-full h-10 rounded-md border border-gray-200 bg-[canvas] text-gray-900 px-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800"
                placeholder="Label name"
                defaultValue={pendingQueryRef}
              />
              <div class="mt-4 flex justify-end gap-4">
                <Dialog.Close class="flex h-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3.5 text-base font-medium text-gray-900 select-none hover:bg-gray-100 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-100">
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  class="flex h-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3.5 text-base font-medium text-gray-900 select-none hover:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-gray-100"
                >
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
