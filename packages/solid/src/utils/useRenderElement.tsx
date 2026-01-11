import { Show, type JSX, type Ref, type ValidComponent } from 'solid-js';
import { Dynamic, type DynamicProps } from 'solid-js/web';
import { mergeProps } from '../merge-props/mergeProps';
import { access, type MaybeAccessor } from '../solid-helpers';
import { EMPTY_OBJECT } from './constants';
import { getStateAttributesProps, type StateAttributesMapping } from './getStateAttributesProps';
import { resolveClassName } from './resolveClassName';
import { resolveStyle } from './resolveStyle';
import type { BaseUIComponentProps, ComponentRenderFn, HTMLProps } from './types';

/**
 * Renders a Base UI element.
 *
 * @param element The default HTML element to render. Can be overridden by the `render` prop.
 * @param componentProps An object containing the `render`, `className` and `ref` props to be used for element customization. Other props are ignored.
 * @param params Additional parameters for rendering the element.
 */
export function useRenderElement<
  State extends Record<string, MaybeAccessor<any>>,
  RenderedElementType extends Element,
  TagName extends keyof JSX.IntrinsicElements | undefined,
  Enabled extends boolean | undefined = undefined,
  RenderFnElement extends ValidComponent = ValidComponent,
>(
  element: MaybeAccessor<TagName>,
  componentProps: RenderElement.ComponentProps<State, RenderedElementType, RenderFnElement>,
  params: RenderElement.Parameters<State, RenderedElementType, TagName, Enabled>,
): (props?: HTMLProps) => Enabled extends false ? null : JSX.Element {
  const state = () => params.state ?? (EMPTY_OBJECT as State);
  const Component = (props: HTMLProps) => {
    return (
      <Show when={access(params.enabled) ?? true}>
        <Dynamic
          component={(p: any) => {
            if (typeof componentProps.render === 'function') {
              return componentProps.render(p, params.state ?? (EMPTY_OBJECT as State));
            }

            if (
              componentProps.render &&
              typeof componentProps.render === 'object' &&
              'component' in componentProps.render
            ) {
              return <Dynamic {...p} component={componentProps.render.component} />;
            }

            return (
              <Dynamic
                component={
                  typeof componentProps.render === 'string'
                    ? componentProps.render
                    : access(element)
                }
                {...(access(element) === 'button' ? { type: 'button' } : {})}
                {...(access(element) === 'img' ? { alt: '' } : {})}
                {...p}
              />
            );
          }}
          {...mergeProps([
            props,

            {
              ref: (el: any) => {
                if (typeof componentProps.ref === 'function') {
                  componentProps.ref(el);
                } else {
                  componentProps.ref = el;
                }

                if (typeof params.ref === 'function') {
                  params.ref(el);
                } else {
                  params.ref = el;
                }
              },
            },

            typeof componentProps.render === 'object' ? (componentProps.render as object) : {},

            getStateAttributesProps(state(), params.stateAttributesMapping),

            mergeProps(params.props),

            {
              component: undefined,
              get class() {
                return resolveClassName(componentProps.class, state());
              },
              get style() {
                return resolveStyle(componentProps.style, state());
              },
            },
          ])}
        >
          {params.children ?? componentProps.children}
        </Dynamic>
      </Show>
    );
  };

  return ((renderFnProps: HTMLProps = {}) => {
    return <Component {...renderFnProps} />;
  }) as (props?: HTMLProps) => Enabled extends false ? null : JSX.Element;
}

export type UseRenderElementParameters<
  State extends Record<string, MaybeAccessor<any>>,
  RenderedElementType extends Element,
  TagName extends keyof JSX.IntrinsicElements | undefined,
  Enabled extends boolean | undefined,
> = {
  /**
   * If `false`, the hook will skip most of its internal logic and return `null`.
   * This is useful for rendering a component conditionally.
   * @default true
   */
  enabled?: MaybeAccessor<Enabled>;
  /**
   * @deprecated
   */
  propGetter?: (externalProps: HTMLProps) => HTMLProps;
  /**
   * The ref to apply to the rendered element.
   */
  ref?: Ref<RenderedElementType>;
  /**
   * The state of the component.
   */
  state?: State;
  /**
   * Intrinsic props to be spread on the rendered element.
   */
  props?:
    | BaseUIComponentProps<TagName, State>
    | Array<
        | BaseUIComponentProps<TagName, State>
        | undefined
        | ((
            props: BaseUIComponentProps<TagName, State>,
          ) => BaseUIComponentProps<TagName, State> | undefined | null)
      >;

  /**
   * A mapping of state to `data-*` attributes.
   */
  stateAttributesMapping?: StateAttributesMapping<State>;
  /**
   * SolidJS only: The children override to render.
   */
  children?: JSX.Element | ((...args: any[]) => JSX.Element);
};

export interface UseRenderElementComponentProps<
  State extends Record<string, MaybeAccessor<any>>,
  RenderedElementType extends Element,
  RenderFnElement extends ValidComponent = ValidComponent,
> {
  /**
   * The class name to apply to the rendered element.
   * Can be a string or a function that accepts the state and returns a string.
   */
  class?: string | ((state: State) => string | undefined);
  /**
   * The render prop or Solid element to override the default element.
   */
  render?:
    | keyof JSX.IntrinsicElements
    | DynamicProps<RenderFnElement>
    | ComponentRenderFn<Record<string, unknown>, State>
    | null
    | undefined;
  /**
   * The style to apply to the rendered element.
   * Can be a style object or a function that accepts the state and returns a style object.
   */
  style?: JSX.CSSProperties | ((state: State) => JSX.CSSProperties | undefined);
  /**
   * The children to render.
   */
  children?: JSX.Element | ((...args: any[]) => JSX.Element);
  /**
   * The ref to apply to the rendered element.
   */
  ref?: Ref<RenderedElementType>;
}

export namespace RenderElement {
  export type Parameters<
    State extends Record<string, MaybeAccessor<any>>,
    RenderedElementType extends Element,
    TagName extends keyof JSX.IntrinsicElements | undefined,
    Enabled extends boolean | undefined,
  > = UseRenderElementParameters<State, RenderedElementType, TagName, Enabled>;
  export type ComponentProps<
    State extends Record<string, MaybeAccessor<any>>,
    RenderedElementType extends Element,
    RenderFnElement extends ValidComponent = ValidComponent,
  > = UseRenderElementComponentProps<State, RenderedElementType, RenderFnElement>;
}
