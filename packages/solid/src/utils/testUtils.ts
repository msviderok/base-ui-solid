/**
 * Whether the test runs in JSDOM environment
 */
export const isJSDOM = /jsdom/.test(window.navigator.userAgent);

export type IfEquals<T, U, Y = unknown, N = never> =
  (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U ? 1 : 2 ? Y : N;

export function expectType<Expected, Actual>(_actual: IfEquals<Actual, Expected, Actual>): void {}
