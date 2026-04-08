import { createSignal, For } from 'solid-js';
import clsx from 'clsx';
import type { NavSection } from '../utils/buildNav';

interface Props {
  nav: NavSection[];
}

export function MobileNav(props: Props) {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <button
        type="button"
        class="HeaderButton whitespace-nowrap"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <span class="flex w-4 flex-col items-center gap-1">
          <span class="h-0.5 w-3.5 bg-current" />
          <span class="h-0.5 w-3.5 bg-current" />
        </span>
        Navigation
      </button>

      {open() && (
        <div
          class="MobileNavBackdrop"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div
        class={clsx('MobileNavPopup', open() ? 'MobileNavPopupOpen' : '')}
        aria-hidden={!open()}
      >
        <div class="MobileNavHeader">
          <a href="/" class="HeaderLogoLink">
            <svg width="17" height="24" viewBox="0 0 17 24" fill="currentcolor" aria-label="Base UI">
              <path d="M9.5001 7.01537C9.2245 6.99837 9 7.22385 9 7.49999V23C13.4183 23 17 19.4183 17 15C17 10.7497 13.6854 7.27351 9.5001 7.01537Z" />
              <path d="M8 9.8V12V23C3.58172 23 0 19.0601 0 14.2V12V1C4.41828 1 8 4.93989 8 9.8Z" />
            </svg>
          </a>
          <button
            type="button"
            class="HeaderButton"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
        <nav class="MobileNavContent">
          <For each={props.nav}>
            {(section) => (
              <div class="MobileNavSection">
                <div class="MobileNavHeading">{section.label}</div>
                <ul class="MobileNavList">
                  <For each={section.links}>
                    {(link) => (
                      <li class="MobileNavItem">
                        <a href={link.href} class="MobileNavLink" onClick={() => setOpen(false)}>
                          {link.label}
                          {link.isNew && <span class="MobileNavBadge">New</span>}
                        </a>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            )}
          </For>
          <div class="MobileNavSection">
            <div class="MobileNavHeading">Resources</div>
            <ul class="MobileNavList">
              <li class="MobileNavItem">
                <a
                  href="https://www.npmjs.com/package/@msviderok/base-ui-solid"
                  class="MobileNavLink"
                  rel="noopener"
                  target="_blank"
                >
                  npm package
                </a>
              </li>
              <li class="MobileNavItem">
                <a
                  href="https://github.com/mui/base-ui"
                  class="MobileNavLink"
                  rel="noopener"
                  target="_blank"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
}
