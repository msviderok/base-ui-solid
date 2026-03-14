import { createEffect, For } from 'solid-js';
import { Toast } from '../index';

/**
 * @internal
 */
export function Button() {
  const { add } = Toast.useToastManager();
  return (
    <button
      type="button"
      onClick={() => {
        add({
          title: 'title',
          description: 'description',
          actionProps: {
            id: 'action',
            children: 'action',
          },
        });
      }}
    >
      add
    </button>
  );
}

/**
 * @internal
 */
export function List() {
  const { toasts } = Toast.useToastManager();

  createEffect(() => {
    console.log(toasts());
  });

  return (
    <For each={toasts()}>
      {(toastItem) => (
        <Toast.Root toast={toastItem} data-testid="root">
          <Toast.Title data-testid="title" />
          <Toast.Description data-testid="description" />
          <Toast.Close aria-label="close-press" />
          <Toast.Action data-testid="action" />
        </Toast.Root>
      )}
    </For>
  );
}
