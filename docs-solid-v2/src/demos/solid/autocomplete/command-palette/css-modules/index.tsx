import { createSignal } from 'solid-js';
import { Dialog } from '@msviderok/base-ui-solid/dialog';
import { Autocomplete } from '@msviderok/base-ui-solid/autocomplete';
import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';
import styles from './index.module.css';

export default function ExampleAutocompleteCommandPalette() {
  const [open, setOpen] = createSignal(false);

  function handleItemClick() {
    setOpen(false);
  }

  return (
    <Dialog.Root open={open()} onOpenChange={setOpen}>
      <Dialog.Trigger class={styles.Button}>Open command palette</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop class={styles.Backdrop} />
        <Dialog.Viewport class={styles.Viewport}>
          <Dialog.Popup class={styles.Popup} aria-label="Command palette">
            <Autocomplete.Root
              open
              inline
              items={groupedItems}
              autoHighlight="always"
              keepHighlight
            >
              <Autocomplete.Input
                class={styles.Input}
                placeholder="Search for apps and commands..."
              />
              <Dialog.Close class={styles.VisuallyHiddenClose}>
                Close command palette
              </Dialog.Close>

              <ScrollArea.Root class={styles.ListArea}>
                <ScrollArea.Viewport class={styles.ListViewport}>
                  <ScrollArea.Content class={styles.ListContent}>
                    <Autocomplete.Empty class={styles.Empty}>
                      No results found.
                    </Autocomplete.Empty>

                    <Autocomplete.List class={styles.List}>
                      {(group: Group) => (
                        <Autocomplete.Group
                          key={group.value}
                          items={group.items}
                          class={styles.Group}
                        >
                          <Autocomplete.GroupLabel class={styles.GroupLabel}>
                            {group.value}
                          </Autocomplete.GroupLabel>
                          <Autocomplete.Collection>
                            {(item: Item) => (
                              <Autocomplete.Item
                                key={item.value}
                                value={item}
                                class={styles.Item}
                                onClick={handleItemClick}
                              >
                                <span class={styles.ItemLabel}>{item.label}</span>
                                <span class={styles.ItemType}>
                                  {group.value === 'Suggestions' ? 'Application' : 'Command'}
                                </span>
                              </Autocomplete.Item>
                            )}
                          </Autocomplete.Collection>
                        </Autocomplete.Group>
                      )}
                    </Autocomplete.List>
                  </ScrollArea.Content>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar class={styles.Scrollbar}>
                  <ScrollArea.Thumb class={styles.ScrollbarThumb} />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>

              <div class={styles.Footer}>
                <div class={styles.FooterLeft}>
                  <span>Activate</span>
                  <kbd class={styles.Kbd}>Enter</kbd>
                </div>
                <div class={styles.FooterRight}>
                  <span>Actions</span>
                  <kbd class={styles.Kbd}>Cmd</kbd>
                  <kbd class={styles.Kbd}>K</kbd>
                </div>
              </div>
            </Autocomplete.Root>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface Item {
  value: string;
  label: string;
}

interface Group {
  value: string;
  items: Item[];
}

const suggestions: Item[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'figma', label: 'Figma' },
  { value: 'slack', label: 'Slack' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'raycast', label: 'Raycast' },
  { value: 'notion', label: 'Notion' },
  { value: 'github', label: 'GitHub' },
  { value: 'jira', label: 'Jira' },
  { value: 'calendar', label: 'Google Calendar' },
  { value: 'chrome', label: 'Google Chrome' },
  { value: 'mail', label: 'Apple Mail' },
  { value: 'terminal', label: 'Terminal' },
];

const commands: Item[] = [
  { value: 'clipboard-history', label: 'Clipboard History' },
  { value: 'import-extension', label: 'Import Extension' },
  { value: 'create-snippet', label: 'Create Snippet' },
  { value: 'system-preferences', label: 'System Preferences' },
  { value: 'window-management', label: 'Window Management' },
  { value: 'toggle-dark-mode', label: 'Toggle Dark Mode' },
  { value: 'new-window', label: 'New Window' },
  { value: 'new-tab', label: 'New Tab' },
  { value: 'search-docs', label: 'Search Documentation' },
  { value: 'capture-screen', label: 'Capture Screenshot' },
  { value: 'close-sidebar', label: 'Toggle Sidebar' },
  { value: 'toggle-terminal', label: 'Toggle Integrated Terminal' },
  { value: 'run-script', label: 'Run Script' },
];

const groupedItems: Group[] = [
  { value: 'Suggestions', items: suggestions },
  { value: 'Commands', items: commands },
];
