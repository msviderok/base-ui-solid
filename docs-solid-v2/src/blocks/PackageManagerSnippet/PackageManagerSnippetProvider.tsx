
import type { JSX } from 'solid-js';
import { createContext, createSignal, onMount, useContext, type Accessor } from 'solid-js';

export interface PackageManagerSnippetContext {
  packageManager: Accessor<string>;
  setPackageManager: (variant: string) => void;
}

export const PackageManagerSnippetContext = createContext<PackageManagerSnippetContext | null>(
  null,
);

export const usePackageManagerSnippetContext = () => {
  const context = useContext(PackageManagerSnippetContext);
  if (!context) {
    throw new Error('Missing PackageManagerSnippetContext');
  }

  return context;
};

interface PackageManagerSnippetProviderProps {
  children: JSX.Element;
  defaultValue: string;
}

const STORAGE_KEY = 'preferredPackageManager';

export function PackageManagerSnippetProvider(props: PackageManagerSnippetProviderProps) {
  const [value, setValue] = createSignal(props.defaultValue);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    localStorage.setItem(STORAGE_KEY, newValue);
  };

  onMount(() => {
    const savedValue = localStorage.getItem(STORAGE_KEY);

    if (savedValue) {
      setValue(savedValue);
    }
  });

  const contextValue = {
    packageManager: value,
    setPackageManager: handleValueChange,
  };

  return (
    <PackageManagerSnippetContext.Provider value={contextValue}>
      {props.children}
    </PackageManagerSnippetContext.Provider>
  );
}
