import { Collapsible } from '@msviderok/base-ui-solid/collapsible';

function ChevronIcon(props: { class?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class={props.class}>
      <path d="M3.5 9L7.5 5L3.5 1" stroke="currentcolor" />
    </svg>
  );
}

export default function ExampleCollapsible() {
  return (
    <Collapsible.Root class="flex min-h-36 w-56 flex-col justify-center text-gray-900">
      <Collapsible.Trigger class="group flex items-center gap-2 rounded-sm bg-gray-100 px-2 py-1 text-sm font-medium hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-800 active:bg-gray-200">
        <ChevronIcon class="size-3 transition-all ease-out group-data-[panel-open]:rotate-90" />
        Recovery keys
      </Collapsible.Trigger>
      <Collapsible.Panel class="flex h-[var(--collapsible-panel-height)] flex-col justify-end overflow-hidden text-sm transition-all ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
        <div class="mt-1 flex cursor-text flex-col gap-2 rounded-sm bg-gray-100 py-2 pl-7">
          <div>alien-bean-pasta</div>
          <div>wild-irish-burrito</div>
          <div>horse-battery-staple</div>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
