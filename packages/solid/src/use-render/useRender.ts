import type { JSX, Ref, ComponentProps as SolidComponentProps, ValidComponent } from 'solid-js';
import type { DynamicProps } from 'solid-js/web';
import { type MaybeAccessor, access } from '../solid-helpers';
import { StateAttributesMapping } from '../utils/getStateAttributesProps';
import type { ComponentRenderFn, HTMLProps } from '../utils/types';
import { useRenderElement } from '../utils/useRenderElement';

/**
 * Renders a Base UI element.
 *
 * @public
 */
export function useRender<
  State extends Record<string, MaybeAccessor<any>>,
  RenderedElementType extends Element,
  Enabled extends boolean | undefined,
>(
  params: useRender.Parameters<State, RenderedElementType, Enabled>,
): useRender.ReturnValue<Enabled> {
  const tag = () => access(params.defaultTagName) ?? 'div';
  return useRenderElement(tag, params, params);
}

export type UseRenderRenderProp<
  State extends Record<string, MaybeAccessor<any>> = Record<string, unknown>,
  ElementType extends ValidComponent = ValidComponent,
> =
  | keyof JSX.IntrinsicElements
  | DynamicProps<ElementType>
  | ComponentRenderFn<JSX.HTMLAttributes<any>, State>
  | null;

export type UseRenderElementProps<ElementType extends ValidComponent> =
  SolidComponentProps<ElementType>;

export type UseRenderComponentProps<
  ElementType extends ValidComponent,
  State extends Record<string, MaybeAccessor<any>> = {},
> = SolidComponentProps<ElementType> & {
  /**
   * Allows you to replace the component’s HTML element
   * with a different tag, or compose it with another component.
   *
   * Accepts a `ReactElement` or a function that returns the element to render.
   */
  render?: UseRenderRenderProp<State, ElementType>;
};

export interface UseRenderParameters<
  State extends Record<string, MaybeAccessor<any>>,
  RenderedElementType extends Element,
  Enabled extends boolean | undefined,
> {
  /**
   * The React element or a function that returns one to override the default element.
   */
  render?: UseRenderRenderProp<State>;
  /**
   * The ref to apply to the rendered element.
   */
  ref?: Ref<RenderedElementType>;
  /**
   * The state of the component, passed as the second argument to the `render` callback.
   * State properties are automatically converted to data-* attributes.
   */
  state?: State;
  /**
   * Custom mapping for converting state properties to data-* attributes.
   * @example
   * { isActive: (value) => (value ? { 'data-is-active': '' } : null) }
   */
  stateAttributesMapping?: StateAttributesMapping<State>;
  /**
   * Props to be spread on the rendered element.
   * They are merged with the internal props of the component, so that event handlers
   * are merged, `className` strings and `style` properties are joined, while other external props overwrite the
   * internal ones.
   */
  props?: Record<string, unknown>;
  /**
   * If `false`, the hook will skip most of its internal logic and return `null`.
   * This is useful for rendering a component conditionally.
   * @default true
   */
  enabled?: MaybeAccessor<Enabled>;
  /**
   * The default tag name to use for the rendered element when `render` is not provided.
   * @default 'div'
   */
  defaultTagName?: MaybeAccessor<keyof JSX.IntrinsicElements>;
  /**
   * The children to render.
   */
  children?: JSX.Element | ((...args: any[]) => JSX.Element);
}

export type UseRenderReturnValue<Enabled extends boolean | undefined> = (
  props?: HTMLProps,
) => Enabled extends false ? null : JSX.Element;

export namespace useRender {
  export type RenderProp<
    State extends Record<string, MaybeAccessor<any>> = Record<string, unknown>,
    ElementType extends ValidComponent = ValidComponent,
  > = UseRenderRenderProp<State, ElementType>;

  export type ElementProps<ElementType extends ValidComponent> = UseRenderElementProps<ElementType>;

  export type ComponentProps<
    ElementType extends ValidComponent,
    State extends Record<string, MaybeAccessor<any>> = {},
  > = UseRenderComponentProps<ElementType, State>;

  export type Parameters<
    State extends Record<string, MaybeAccessor<any>>,
    RenderedElementType extends Element,
    Enabled extends boolean | undefined,
  > = UseRenderParameters<State, RenderedElementType, Enabled>;

  export type ReturnValue<Enabled extends boolean | undefined> = UseRenderReturnValue<Enabled>;
}
