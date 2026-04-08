import { createContext, useContext, type Accessor } from 'solid-js';
import { DemoFile, DemoVariant } from './types';

export interface DemoContext {
  selectedFile: Accessor<DemoFile>;
  selectedVariant: Accessor<DemoVariant>;
  setSelectedFile: (file: DemoFile) => void;
  setSelectedVariant: (variant: DemoVariant) => void;
  variants: Accessor<DemoVariant[]>;
}

export const DemoContext = createContext<DemoContext | undefined>(undefined);

export function useDemoContext() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoContext must be used within a DemoProvider');
  }
  return context;
}
