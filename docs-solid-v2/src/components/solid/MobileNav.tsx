import type { NavSection } from '@/lib/buildNav';
import clsx from 'clsx';
import { createSignal, For } from 'solid-js';
import { Logo } from './Logo';

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

      {open() && <div class="MobileNavBackdrop" onClick={() => setOpen(false)} aria-hidden />}

      <div class={clsx('MobileNavPopup', open() ? 'MobileNavPopupOpen' : '')} aria-hidden={!open()}>
        <div class="MobileNavHeader">
          <a href="/" class="HeaderLogoLink">
            <Logo aria-label="Base UI" />
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
                          {link.isPreview && <span class="MobileNavBadge">Preview</span>}
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
