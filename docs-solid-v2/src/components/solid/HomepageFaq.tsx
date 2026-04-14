import { Accordion } from '@msviderok/base-ui-solid/accordion';
import { For } from 'solid-js';

const FAQ = [
  {
    q: 'What is Base UI?',
    a: 'Base UI is a library of unstyled UI components for building accessible component libraries, user interfaces, web applications, and websites with Solid. Base UI components are highly configurable, composable, and customizable.',
  },
  {
    q: 'Does Base UI work with any styling library?',
    a: 'Yes. Base UI works with Tailwind, CSS Modules, CSS-in-JS, plain CSS, and any other styling library you prefer. It also works with JavaScript animation libraries like Motion, or just plain CSS transitions.',
  },
  {
    q: 'Which accessibility standards does Base UI follow?',
    a: 'When designing and speccing components, we follow ARIA Authoring Practices Guide patterns, and comply with the WCAG 2.2 standard.',
  },
  {
    q: 'How does Base UI differ from Radix UI?',
    a: 'In terms of API design, both libraries are very similar. Base UI provides more complex components and deeper feature support. Base UI is more robust and more polished in terms of a11y and edge case handling.',
  },
  {
    q: 'Is Base UI free for commercial use?',
    a: 'Yes. Base UI is licensed under the MIT license, and is free for commercial use.',
  },
];

export function HomepageFaq() {
  return (
    <Accordion.Root class="AccordionRoot">
      <For each={FAQ}>
        {(item) => (
          <Accordion.Item class="AccordionItem">
            <Accordion.Header class="AccordionHeader">
              <Accordion.Trigger class="AccordionTrigger Text size-2">
                {item.q}
                <svg
                  class="AccordionIcon AccordionIconPlus"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M8 3v10M3 8h10" />
                </svg>
                <svg
                  class="AccordionIcon AccordionIconMinus"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M3 8h10" />
                </svg>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel class="AccordionPanel">
              <p class="Text size-2">{item.a}</p>
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </For>
    </Accordion.Root>
  );
}
