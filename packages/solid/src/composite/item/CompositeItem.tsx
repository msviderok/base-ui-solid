import { mergeProps as solidMergeProps, type JSX, type Ref } from 'solid-js';
import { splitComponentProps, type MaybeAccessor } from '../../solid-helpers';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../../utils/constants';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useCompositeItem } from './useCompositeItem';

/**
 * @internal
 */
export function CompositeItem<Metadata, State extends Record<string, any>>(
  componentProps: CompositeItem.Props<Metadata, State>,
) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'state',
    'props',
    'refs',
    'metadata',
    'stateAttributesMapping',
    'tag',
    'children',
  ]);
  const mergedProps = solidMergeProps(
    {
      state: EMPTY_OBJECT as State,
      props: EMPTY_ARRAY,
      refs: EMPTY_ARRAY,
      tag: 'div',
    } as typeof local,
    local,
  );
  const { compositeProps, setCompositeRef } = useCompositeItem({ metadata: local.metadata });

  const element = useRenderElement(() => mergedProps.tag, componentProps, {
    get state() {
      return mergedProps.state;
    },
    get ref() {
      return [mergedProps.refs, setCompositeRef];
    },
    get props() {
      return [compositeProps, mergedProps.props, elementProps];
    },
    get stateAttributesMapping() {
      return mergedProps.stateAttributesMapping;
    },
    get children() {
      return local.children;
    },
  });

  return <>{element()}</>;
}

export interface CompositeItemProps<Metadata, State extends Record<string, any>> extends Pick<
  BaseUIComponentProps<any, State>,
  'render' | 'class'
> {
  children?: JSX.Element;
  metadata?: MaybeAccessor<Metadata | undefined>;
  refs?: Ref<HTMLElement | null | undefined> | Ref<HTMLElement | null | undefined>[];
  props?: Array<Record<string, any> | (() => Record<string, any>)> | undefined;
  state?: State | undefined;
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  tag?: keyof JSX.IntrinsicElements | undefined;
}

export namespace CompositeItem {
  export type Props<Metadata, State extends Record<string, any>> = CompositeItemProps<
    Metadata,
    State
  >;
}
