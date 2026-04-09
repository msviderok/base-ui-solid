import { Progress } from '@msviderok/base-ui-solid/progress';
import { createSignal, onCleanup, onMount } from 'solid-js';

export default function ExampleProgress() {
  const [value, setValue] = createSignal(20);

  // Simulate changes
  onMount(() => {
    const interval = setInterval(() => {
      setValue((current) => Math.min(100, Math.round(current + Math.random() * 25)));
    }, 1000);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <Progress.Root class="grid w-48 grid-cols-2 gap-y-2" value={value()}>
      <Progress.Label class="text-sm font-medium text-gray-900">Export data</Progress.Label>
      <Progress.Value class="col-start-2 text-right text-sm text-gray-900" />
      <Progress.Track class="col-span-full h-1 overflow-hidden rounded bg-gray-200 shadow-[inset_0_0_0_1px] shadow-gray-200">
        <Progress.Indicator class="block bg-gray-500 transition-all duration-500" />
      </Progress.Track>
    </Progress.Root>
  );
}
