import type { Component } from 'solid-js';

export interface DemoFile {
  raw: string;
  highlighted: string;
}

export interface DemoVariantData {
  Component: Component;
  files: Record<string, DemoFile>;
}

export interface DemoEntry {
  variants: string[];
  [variantName: string]: string[] | DemoVariantData;
}

export interface DemoManifestEntry {
  variants: string[];
  load: () => Promise<{ default: DemoEntry | null }>;
}

declare module 'virtual:demos-manifest' {
  export const demoManifest: Record<string, DemoManifestEntry>;
}
