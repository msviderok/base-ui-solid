import copy from 'clipboard-copy';
import {
  createMemo,
  Show,
  splitProps,
  type Accessor,
  type Component,
  type ComponentProps,
  type JSX,
} from 'solid-js';
import { useDemoContext } from './DemoContext';

export function DemoSourceCopy(props: DemoSourceCopy.Props) {
  const [local, other] = splitProps(props, ['onCopied', 'onError', 'onClick', 'render']);

  const { selectedFile } = useDemoContext();

  const handleClick = async (event: MouseEvent) => {
    try {
      await copy(selectedFile().content);
      local.onCopied?.();
    } catch (error) {
      local.onError?.(error);
    }

    // TODO: fix typing
    if (local.onClick) {
      (local.onClick as any)(event);
    }
  };

  const renderProps = createMemo<ComponentProps<'button'>>(() => {
    return {
      ...other,
      onClick: handleClick,
      ref: props.ref,
    };
  });

  return (
    <Show when={selectedFile()}>
      <Show when={local.render === undefined} fallback={local.render!(renderProps)}>
        <button type="button" {...other} onClick={handleClick} ref={props.ref} />{' '}
      </Show>
    </Show>
  );
}

export namespace DemoSourceCopy {
  export interface Props extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    onCopied?: () => void;
    onError?: (error: unknown) => void;
    render?: Component<Accessor<ComponentProps<'button'>>>;
  }
}
