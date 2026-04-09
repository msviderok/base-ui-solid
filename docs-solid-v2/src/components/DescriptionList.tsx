import clsx from 'clsx';
import { splitProps, type ComponentProps } from 'solid-js';

export function Root(props: ComponentProps<'dl'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <dl class={clsx('DescriptionList', local.class)} {...rest} />;
}

export function Item(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <div class={clsx('DescriptionListItem', local.class)} {...rest} />;
}

export function Term(props: ComponentProps<'dt'> & { separator?: boolean }) {
  const [local, rest] = splitProps(props, ['class', 'children', 'separator']);
  return (
    <dt class={clsx('DescriptionTerm', local.separator && 'separator', local.class)} {...rest}>
      <Inner>{local.children}</Inner>
    </dt>
  );
}

export function Details(props: ComponentProps<'dd'>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <dd class={clsx('DescriptionListDetails', local.class)} {...rest}>
      <Inner>{local.children}</Inner>
    </dd>
  );
}

function Inner(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <div class={clsx('DescriptionListInner', local.class)} {...rest} />;
}
