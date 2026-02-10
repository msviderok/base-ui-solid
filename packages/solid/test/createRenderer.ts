import { queries, render as testingLibraryRender } from '@solidjs/testing-library';
import { userEvent } from '@testing-library/user-event';
import { type Component } from 'solid-js';
import { createDynamic } from 'solid-js/web';
import { createClock, type Clock, type ClockConfig } from './createClock';
import { customQueries, type MuiRenderResult, type RenderOptions } from './describeConformance';

export type BaseUIRenderResult = MuiRenderResult;

interface DataAttributes {
  [key: `data-${string}`]: string | undefined;
}

type BaseUITestRenderer = {
  clock: Clock;
  render: (
    element: Component,
    elementProps?: DataAttributes,
    options?: RenderOptions,
  ) => BaseUIRenderResult;
};

export interface CreateRendererOptions {
  /**
   * @default 'real'
   */
  clock?: 'fake' | 'real';
  clockConfig?: ClockConfig;
  clockOptions?: Parameters<typeof createClock>[2];
  /**
   * Vitest needs to be injected because this file is transpiled to commonjs and vitest is an esm module.
   * @default {}
   */
  vi?: any;
}

export function createRenderer(globalOptions: CreateRendererOptions = {}): BaseUITestRenderer {
  const {
    clock = 'real',
    clockConfig,
    clockOptions,
    vi = (globalThis as any).vi || {},
  } = globalOptions;

  return {
    clock: createClock(clock, clockConfig, clockOptions, vi),
    render(element, elementProps = {}, options = {}) {
      return {
        ...(testingLibraryRender(() => createDynamic(() => element, elementProps), {
          ...options,
          queries: { ...queries, ...customQueries },
        }) as any),
        user: userEvent.setup(),
      };
    },
  };
}

export function randomStringValue() {
  return Math.random().toString(36).substring(2, 15);
}
