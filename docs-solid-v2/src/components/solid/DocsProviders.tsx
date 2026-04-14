import { PackageManagerSnippetProvider } from '@/blocks/PackageManagerSnippet/PackageManagerSnippetProvider';
import type { JSX } from 'solid-js';

interface Props {
  children: JSX.Element;
}

export function DocsProviders(props: Props) {
  return (
    <PackageManagerSnippetProvider defaultValue="npm">
      {props.children}
    </PackageManagerSnippetProvider>
  );
}
