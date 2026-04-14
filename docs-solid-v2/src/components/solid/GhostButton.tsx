import clsx from 'clsx';
import { splitProps, type ComponentProps } from 'solid-js';

interface GhostButtonProps extends ComponentProps<'button'> {
  layout?: 'text' | 'icon';
}

export function GhostButton(props: GhostButtonProps) {
  const [local, rest] = splitProps(props, ['class', 'layout']);
  return (
    <button
      type="button"
      data-layout={local.layout ?? 'text'}
      class={clsx('GhostButton', local.class)}
      {...rest}
    />
  );
}
