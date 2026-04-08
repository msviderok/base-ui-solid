import type { Component } from 'solid-js';

export interface DemoFile {
  raw: string;
  highlighted: string;
}

export interface DemoVariantData {
  componentIndex: number;
  files: Record<string, DemoFile>;
}

export interface DemoData {
  variants: string[];
  [variantName: string]: string[] | DemoVariantData;
}

declare module 'virtual:demos' {
  export const demoComponents: Component[];
  export const demoData: Record<string, DemoData>;
}
