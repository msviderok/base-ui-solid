/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module 'virtual:demos-manifest' {
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

  export const demoManifest: Record<string, DemoManifestEntry>;
}
