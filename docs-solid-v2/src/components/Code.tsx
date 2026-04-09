import clsx from 'clsx';
import { splitProps, type ComponentProps } from 'solid-js';

export function Code(props: ComponentProps<'code'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <code class={clsx('Code', local.class)} {...rest} />;
}
