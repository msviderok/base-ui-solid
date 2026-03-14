import { children, createEffect, createMemo, onCleanup, Show } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useId } from '../../utils/useId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useToastRootContext } from '../root/ToastRootContext';

/**
 * A description that describes the toast.
 * Can be used as the default message for the toast when no title is provided.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastDescription(componentProps: ToastDescription.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id', 'children']);
  const idProp = () => local.id;

  const { toast, setDescriptionId } = useToastRootContext();

  const safeChildren = children(() => local.children ?? toast().description);

  const shouldRender = createMemo(() => Boolean(safeChildren()));

  const id = useId(idProp);

  createEffect(() => {
    if (!shouldRender()) {
      return;
    }

    setDescriptionId(id());

    onCleanup(() => {
      setDescriptionId(undefined);
    });
  });

  const state: ToastDescription.State = {
    get type() {
      return toast().type;
    },
  };

  const element = useRenderElement('p', componentProps, {
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

export interface ToastDescriptionState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastDescriptionProps extends BaseUIComponentProps<'p', ToastDescription.State> {}

export namespace ToastDescription {
  export type State = ToastDescriptionState;
  export type Props = ToastDescriptionProps;
}
