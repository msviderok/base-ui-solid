import { createSignal, onCleanup, onMount } from 'solid-js';

const STORAGE_KEY = 'preferredDemoVariant';

const [preferredDemoVariant, setPreferredDemoVariantSignal] = createSignal('');

let hasInitializedFromStorage = false;

function readStoredVariant() {
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

function writeStoredVariant(value: string) {
  if (value) {
    window.localStorage.setItem(STORAGE_KEY, value);
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function setPreferredDemoVariant(value: string) {
  setPreferredDemoVariantSignal(value);
  writeStoredVariant(value);
}

export function usePreferredDemoVariant() {
  onMount(() => {
    if (!hasInitializedFromStorage) {
      hasInitializedFromStorage = true;
      setPreferredDemoVariantSignal(readStoredVariant());
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      setPreferredDemoVariantSignal(event.newValue ?? '');
    };

    window.addEventListener('storage', handleStorage);
    onCleanup(() => window.removeEventListener('storage', handleStorage));
  });

  return preferredDemoVariant;
}
