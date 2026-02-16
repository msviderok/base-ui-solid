import { createSignal, onCleanup, onMount, type Accessor } from 'solid-js';
import { isServer } from 'solid-js/web';
import { access, type MaybeAccessor } from '../solid-helpers';

export function useMediaQuery(
  query: MaybeAccessor<string>,
  options: useMediaQuery.Options,
): Accessor<boolean> {
  // Wait for jsdom to support the match media feature.
  // All the browsers Base UI support have this built-in.
  // This defensive check is here for simplicity.
  // Most of the time, the match media logic isn't central to people tests.
  const supportMatchMedia = () =>
    typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined';

  const safeQuery = () => access(query).replace(/^@media( ?)/m, '');
  const defaultMatches = () => access(options.defaultMatches) ?? false;
  const matchMedia = () => options.matchMedia ?? (supportMatchMedia() ? window.matchMedia : null);
  const ssrMatchMedia = () => options.ssrMatchMedia ?? null;
  const noSsr = () => access(options.noSsr) ?? false;
  const [match, setMatch] = createSignal(defaultMatches());

  onMount(() => {
    const matchMediaValue = matchMedia();
    if (matchMediaValue === null) {
      setMatch(defaultMatches());
      return;
    }

    function notify(event: MediaQueryListEvent) {
      setMatch(event.matches);
    }

    const mediaQueryList = matchMediaValue(safeQuery());
    mediaQueryList.addEventListener('change', notify);
    onCleanup(() => {
      mediaQueryList.removeEventListener('change', notify);
    });
  });

  if (isServer) {
    const matchMediaValue = matchMedia();
    if (noSsr() && matchMediaValue) {
      return () => matchMediaValue(safeQuery()).matches;
    }

    const ssrMatch = ssrMatchMedia();
    if (ssrMatch !== null) {
      const { matches } = ssrMatch(safeQuery());
      setMatch(matches);
      return () => matches;
    }

    setMatch(defaultMatches());
    return () => defaultMatches();
  }

  return match;
}

export interface UseMediaQueryOptions {
  /**
   * As `window.matchMedia()` is unavailable on the server,
   * it returns a default matches during the first mount.
   * @default false
   */
  defaultMatches?: MaybeAccessor<boolean | undefined>;
  /**
   * You can provide your own implementation of matchMedia.
   * This can be used for handling an iframe content window.
   */
  matchMedia?: typeof window.matchMedia | undefined;
  /**
   * To perform the server-side hydration, the hook needs to render twice.
   * A first time with `defaultMatches`, the value of the server, and a second time with the resolved value.
   * This double pass rendering cycle comes with a drawback: it's slower.
   * You can set this option to `true` if you use the returned value **only** client-side.
   * @default false
   */
  noSsr?: MaybeAccessor<boolean | undefined>;
  /**
   * You can provide your own implementation of `matchMedia`, it's used when rendering server-side.
   */
  ssrMatchMedia?: ((query: string) => { matches: boolean }) | undefined;
}

export namespace useMediaQuery {
  export type Options = UseMediaQueryOptions;
}
