import solidPlugin from 'vite-plugin-solid';
import { defineProject, mergeConfig } from 'vitest/config';
// eslint-disable-next-line import/no-relative-packages
import sharedConfig from '../../vitest.shared.mts';

export default mergeConfig(
  sharedConfig,
  defineProject({
    define: {
      'process.env.NODE_ENV': JSON.stringify('test'),
    },
    plugins: [solidPlugin() as any],
    test: {
      ...sharedConfig.test,
      // browser: {
      //   enabled: true,
      //   provider: 'playwright',
      //   screenshotFailures: false,
      //   headless: true,
      //   instances: [{ browser: 'chromium', name: 'chromium-solid' }],
      // },
      server: {
        deps: {
          inline: ['@mui/internal-test-utils', '@solidjs/testing-library', 'solid-js'],
        },
      },
    },
  }),
);
