import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';
import clsx from 'clsx';
import { splitProps } from 'solid-js';

export const Root = ScrollArea.Root;

export function Viewport(props: ScrollArea.Viewport.Props) {
  const [local, rest] = splitProps(props, ['class']);
  return <ScrollArea.Viewport class={clsx('ScrollAreaViewport', local.class)} {...rest} />;
}

export function Scrollbar(props: ScrollArea.Scrollbar.Props) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <ScrollArea.Scrollbar class={clsx('ScrollAreaScrollbar', local.class)} {...rest}>
      <ScrollArea.Thumb class="ScrollAreaThumb" />
    </ScrollArea.Scrollbar>
  );
}

export function Corner(props: ScrollArea.Corner.Props) {
  const [local, rest] = splitProps(props, ['class']);
  return <ScrollArea.Corner class={clsx('ScrollAreaCorner', local.class)} {...rest} />;
}
