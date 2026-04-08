import { Tabs } from '@msviderok/base-ui-solid/tabs';
import type { JSX } from 'solid-js';

export function PackageManagerSnippetCode(props: PackageManagerSnippetCode.Props) {
  return <Tabs.Panel value={props.value}>{props.children}</Tabs.Panel>;
}

export namespace PackageManagerSnippetCode {
  export type Props = {
    children: JSX.Element;
    value: string;
  };
}
