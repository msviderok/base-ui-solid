import { children, createEffect, createMemo, on, onCleanup, onMount, Show } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useId } from '../../utils/useId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useToastRootContext } from '../root/ToastRootContext';

/**
 * A title that labels the toast.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastTitle(componentProps: ToastTitle.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id', 'children']);
  const idProp = () => local.id;

  const { toast, setTitleId } = useToastRootContext();

  const safeChildren = children(() => local.children ?? toast().title);

  const shouldRender = createMemo(() => Boolean(safeChildren()));

  const id = useId(idProp);

  createEffect(() => {
    if (!shouldRender()) {
      return;
    }

    setTitleId(id());

    onCleanup(() => {
      setTitleId(undefined);
    });
  });

  const state: ToastTitle.State = {
    get type() {
      return toast().type;
    },
  };

  const element = useRenderElement('h2', componentProps, {
    state,
    props: [
      {
        get id() {
          return id();
        },
      },
      elementProps,
    ],
    get children() {
      return safeChildren();
    },
  });

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface ToastTitleState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastTitleProps extends BaseUIComponentProps<'h2', ToastTitle.State> {}

export namespace ToastTitle {
  export type State = ToastTitleState;
  export type Props = ToastTitleProps;
}
