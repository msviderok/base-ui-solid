import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';
import scrollIntoView from 'scroll-into-view-if-needed';
import { createEffect, For, on, onMount, type ParentProps } from 'solid-js';
import type { NavLink, NavSection } from '../utils/buildNav';
import { HEADER_HEIGHT } from '../utils/constants';

export default function SideNav(props: ParentProps<{ pathname: string; sitemap: NavSection[] }>) {
  console.log(props.sitemap);
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport data-side-nav-viewport class="SideNavViewport">
        <For each={props.sitemap}>
          {(section) => (
            <div class="SideNavSection">
              <div class="SideNavHeading">{section.label}</div>
              <ul class="SideNavList">
                <For each={section.links}>
                  {(link) => <Item link={link} currentPath={props.pathname} />}
                </For>
              </ul>
            </div>
          )}
        </For>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar class="SideNavScrollbar" orientation="vertical">
        <ScrollArea.Thumb class="SideNavScrollbarThumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

const SCROLL_MARGIN = 48;

function Item(props: { link: NavLink; currentPath: string }) {
  let ref: HTMLLIElement | undefined;
  const active = () => props.currentPath === props.link.href;
  let rem = 16;

  onMount(() => {
    rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  });

  createEffect(
    on(active, () => {
      if (ref && active()) {
        const scrollMargin = (SCROLL_MARGIN * rem) / 16;
        const headerHeight = (HEADER_HEIGHT * rem) / 16;
        const viewport = document.querySelector('[data-side-nav-viewport]');

        if (!viewport) {
          return;
        }

        scrollIntoView(ref, {
          block: 'nearest',
          scrollMode: 'if-needed',
          boundary: (parent) => viewport.contains(parent),
          behavior: (actions) => {
            actions.forEach(({ top }) => {
              const dir = viewport.scrollTop > top ? -1 : 1;
              const offset = Math.max(0, headerHeight - Math.max(0, window.scrollY));
              viewport.scrollTop = top + offset + scrollMargin * dir;
            });
          },
        });
      }
    }),
  );

  return (
    <li ref={ref} class="SideNavItem">
      <a
        class="SideNavLink"
        href={props.link.href}
        aria-current={active() ? 'page' : undefined}
        data-active={active() || undefined}
        onClick={(e) => {
          if (!active()) {
            e.preventDefault();
          }
          // Scroll to top smoothly when clicking on the currently active item
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        {props.link.label}
        {props.link.isNew && <span class="SideNavBadge">New</span>}
      </a>
    </li>
  );
}
