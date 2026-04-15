import type { Root as HastRoot, RootData } from 'hast';

export interface DemoSourceData extends RootData {
  totalLines?: number;
  preClassName?: string;
  preStyle?: string;
}

export type DemoSourceHast = HastRoot & {
  data?: DemoSourceData;
};

export interface SerializedDemoSource {
  hastJson: string;
}

export type DemoSource = string | DemoSourceHast | SerializedDemoSource;

export interface DemoFile {
  /**
   * Absolute path to the file.
   */
  path: string;
  /**
   * Base name of the file.
   */
  name: string;
  /**
   * Content of the file.
   */
  content: string;
  /**
   * Syntax-highlighted source of the file.
   */
  source?: DemoSource;
  /**
   * Type of the file.
   */
  type: string;
}

export interface DemoVariant {
  /**
   * Variant identifier.
   */
  name: string;
  /**
   * Language of the entry point file.
   */
  language: 'ts' | 'js';
  /**
   * Reference to the runnable demo component.
   */
  component: any;
  /**
   * Files the demo consists of.
   */
  files: DemoFile[];
}
