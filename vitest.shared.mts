import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type UserWorkspaceConfig } from 'vitest/config';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(CURRENT_DIR, './');
const environment = process.env.VITEST_ENV;

type BrowserModeConfig = (UserWorkspaceConfig['test'] & {})['browser'];
type BrowserProvider = NonNullable<BrowserModeConfig>['provider'];

const supportedBrowsers = ['chromium', 'webkit', 'firefox'];
const playwrightProvider = 'playwright' as unknown as BrowserProvider;

function getBrowserConfig(): BrowserModeConfig {
  if (
    !!environment &&
    (supportedBrowsers.includes(environment) || environment === 'all-browsers')
  ) {
    const commonConfig = {
      enabled: true,
      provider: playwrightProvider,
      screenshotFailures: false,
    } satisfies BrowserModeConfig;

    if (environment === 'all-browsers') {
      return {
        ...commonConfig,
        headless: true,
        instances: supportedBrowsers.map((browser) => ({ browser })),
      };
    }

    if (supportedBrowsers.includes(environment)) {
      return {
        ...commonConfig,
        headless: true,
        instances: [{ browser: environment }],
      };
    }
  }

  return undefined;
}

const config: UserWorkspaceConfig = {
  test: {
    exclude: ['node_modules', 'build', '**/*.spec.*'],
    globals: true,
    setupFiles: [resolve(WORKSPACE_ROOT, './test/setupVitest.ts')],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        pretendToBeVisual: true,
        url: 'http://localhost',
      },
    },
    browser: getBrowserConfig(),
    env: {
      VITEST: 'true',
      VITEST_ENV: 'jsdom',
    },
    alias: {
      '@testing-library/react/pure': resolve(
        WORKSPACE_ROOT,
        './node_modules/@testing-library/react/pure.js',
      ),
    },
    retry: 1,
  },
  resolve: {
    alias: {
      docs: resolve(WORKSPACE_ROOT, './docs'),
      '@testing-library/react/pure': resolve(
        WORKSPACE_ROOT,
        './node_modules/@testing-library/react/pure.js',
      ),
    },
  },
};

export default config;
