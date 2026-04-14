import clsx from 'clsx';
import { splitProps, type ComponentProps } from 'solid-js';

export function Popup(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <div class={clsx('Popup', local.class)} {...rest} />;
}
