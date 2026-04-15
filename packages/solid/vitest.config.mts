import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import solidPlugin from 'vite-plugin-solid';
import { defineProject, mergeConfig } from 'vitest/config';
// eslint-disable-next-line import/no-relative-packages
import sharedConfig from '../../vitest.shared.mts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, '../..');

export default mergeConfig(
  sharedConfig,
  defineProject({
    define: {
      'process.env.NODE_ENV': JSON.stringify('test'),
    },
    plugins: [solidPlugin() as any],
    resolve: {
      alias: {
        '@msviderok/base-ui-solid': resolve(__dirname, 'src'),
      },
    },
    test: {
      // TODO: Remove this once we have solved the PopoverPopup test timeout issue.
      // testTimeout: 500,
      server: {
        deps: {
          inline: ['@solidjs/testing-library', 'solid-js', '@solidjs/router'],
        },
      },
    },
  }),
);
