import { Tabs } from '@msviderok/base-ui-solid/tabs';
import { createSignal, For, onMount, type JSX } from 'solid-js';
import { usePackageManagerSnippetContext } from './PackageManagerSnippetProvider';

export function PackageManagerSnippetRoot(props: PackageManagerSnippetRoot.Props) {
  const { packageManager: globalPreference, setPackageManager: setGlobalPreference } =
    usePackageManagerSnippetContext();

  const [value, setValue] = createSignal(props.options[0].value);

  const handleValueChange = (newValue: string) => {
    setGlobalPreference(newValue);
  };

  onMount(() => {
    if (props.options.some((option) => option.value === globalPreference())) {
      setValue(globalPreference());
    }
  });

  return (
    <Tabs.Root value={value} onValueChange={handleValueChange}>
      <Tabs.List render={props.renderTabsList} aria-label="Package manager selector">
        <For each={props.options}>
          {(option) => (
            <Tabs.Tab value={option.value} render={props.renderTab}>
              {option.label}
            </Tabs.Tab>
          )}
        </For>
      </Tabs.List>
      {props.children}
    </Tabs.Root>
  );
}

export namespace PackageManagerSnippetRoot {
  export type Props = {
    children: JSX.Element;
    options: Array<{ value: string; label: string }>;
    renderTab?: Tabs.Tab.Props['render'];
    renderTabsList?: Tabs.List.Props['render'];
  };
}
