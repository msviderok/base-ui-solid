import { createContext, useContext } from 'solid-js';
import { ToastStore } from '../store';

export type ToastContext = ToastStore;

export const ToastContext = createContext<ToastContext | undefined>(undefined);

export function useToastProviderContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('Base UI: useToastManager must be used within <Toast.Provider>.');
  }
  return context;
}
