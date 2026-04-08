import type { JSX } from 'solid-js';
import { PackageManagerSnippetProvider } from '../blocks/PackageManagerSnippet/PackageManagerSnippetProvider';

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
