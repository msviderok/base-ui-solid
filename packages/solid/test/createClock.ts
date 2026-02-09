import { useFakeTimers } from 'sinon';

export interface Clock {
  /**
   * Runs all timers until there are no more remaining.
   * WARNING: This may cause an infinite loop if a timeout constantly schedules another timeout.
   * Prefer to to run only pending timers with `runToLast` and unmount your component directly.
   */
  runAll(): void;
  /**
   * Runs only the currently pending timers.
   */
  runToLast(): void;
  /**
   * Tick the clock ahead `timeoutMS` milliseconds.
   * @param timeoutMS
   */
  tick(timeoutMS: number): void;
  /**
   * Tick the clock ahead `timeoutMS` milliseconds. And also flush any microtasks queued in between.
   * @param timeoutMS
   */
  tickAsync(timeoutMS: number): Promise<void>;
  /**
   * Returns true if we're running with "real" i.e. native timers.
   */
  isReal(): boolean;
  /**
   * Runs the current test suite (i.e. `describe` block) with fake timers.
   */
  withFakeTimers(): void;
  /**
   * Restore the real timer
   */
  restore(): void;
}

export type ClockConfig = undefined | number | Date;

const isVitest =
  // VITEST is present on the environment when not in browser mode.
  process.env.VITEST === 'true' ||
  // VITEST_BROWSER_DEBUG is present on vitest in browser mode.
  typeof process.env.VITEST_BROWSER_DEBUG !== 'undefined';

function createVitestClock(
  defaultMode: 'fake' | 'real',
  config: ClockConfig,
  options: Exclude<Parameters<typeof useFakeTimers>[0], number | Date>,
  vi: any,
): Clock {
  if (defaultMode === 'fake') {
    beforeEach(() => {
      vi.useFakeTimers(options);
      if (config) {
        vi.setSystemTime(config);
      }
    });
    afterEach(() => {
      vi.useRealTimers();
    });
  } else {
    beforeEach(() => {
      if (config) {
        vi.setSystemTime(config);
      }
    });
    afterEach(() => {
      vi.useRealTimers();
    });
  }

  return {
    withFakeTimers: () => {
      beforeEach(() => {
        vi.useFakeTimers(options);
      });
      afterEach(() => {
        vi.useRealTimers();
      });
    },
    runToLast: () => {
      vi.runOnlyPendingTimers();
    },
    isReal() {
      return !vi.isFakeTimers();
    },
    restore() {
      vi.useRealTimers();
    },
    tick(timeoutMS: number) {
      vi.advanceTimersByTime(timeoutMS);
    },
    async tickAsync(timeoutMS: number) {
      await vi.advanceTimersByTimeAsync(timeoutMS);
    },
    runAll() {
      vi.runAllTimers();
    },
  };
}

export function createClock(
  defaultMode: 'fake' | 'real',
  config: ClockConfig,
  options: Exclude<Parameters<typeof useFakeTimers>[0], number | Date>,
  vi: any,
): Clock {
  if (isVitest) {
    return createVitestClock(defaultMode, config, options, vi);
  }

  let clock: ReturnType<typeof useFakeTimers> | null = null;

  let mode = defaultMode;

  beforeEach(() => {
    if (mode === 'fake') {
      clock = useFakeTimers({
        now: config,
        // useIsFocusVisible schedules a global timer that needs to persist regardless of whether components are mounted or not.
        // Technically we'd want to reset all modules between tests but we don't have that technology.
        // In the meantime just continue to clear native timers like with did for the past years when using `sinon` < 8.
        shouldClearNativeTimers: true,
        ...options,
      });
    }
  });

  afterEach(() => {
    clock?.restore();
    clock = null;
  });

  return {
    tick(timeoutMS: number) {
      if (clock === null) {
        throw new Error(`Can't advance the real clock. Did you mean to call this on fake clock?`);
      }
      clock!.tick(timeoutMS);
    },
    async tickAsync(timeoutMS: number) {
      await vi.advanceTimersByTimeAsync(timeoutMS);
    },
    runAll() {
      if (clock === null) {
        throw new Error(`Can't advance the real clock. Did you mean to call this on fake clock?`);
      }
      clock!.runAll();
    },
    runToLast() {
      if (clock === null) {
        throw new Error(`Can't advance the real clock. Did you mean to call this on fake clock?`);
      }
      clock!.runToLast();
    },
    isReal() {
      return setTimeout.hasOwnProperty('clock') === false;
    },
    withFakeTimers() {
      mode = 'fake';
    },
    restore() {
      clock?.restore();
    },
  };
}
