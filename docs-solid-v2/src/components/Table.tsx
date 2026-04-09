import clsx from 'clsx';
import { splitProps, type ComponentProps } from 'solid-js';
import { observeScrollableInner } from '../utils/observeScrollableInner';

export function Root(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={clsx('TableRoot', local.class)} {...rest}>
      <table class="TableRootTable">{local.children}</table>
    </div>
  );
}

export function Head(props: ComponentProps<'thead'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <thead class={clsx('TableHead', local.class)} {...rest} />;
}

export function Body(props: ComponentProps<'tbody'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <tbody class={clsx('TableBody', local.class)} {...rest} />;
}

export function Row(props: ComponentProps<'tr'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <tr class={clsx('TableRow', local.class)} {...rest} />;
}

export function ColumnHeader(props: Omit<ComponentProps<'th'>, 'scope'>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <th scope="col" class={clsx('TableColumnHeader', local.class)} {...rest}>
      <span class="TableCellInner">{local.children}</span>
    </th>
  );
}

export function RowHeader(props: Omit<ComponentProps<'th'>, 'scope'>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <th scope="row" ref={observeScrollableInner} class={clsx('TableCell', local.class)} {...rest}>
      <span class="TableCellInner">{local.children}</span>
    </th>
  );
}

export function Cell(props: ComponentProps<'td'>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <td ref={observeScrollableInner} class={clsx('TableCell', local.class)} {...rest}>
      <span class="TableCellInner">{local.children}</span>
    </td>
  );
}
