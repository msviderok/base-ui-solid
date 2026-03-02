import type { ComponentProps, JSX, ValidComponent } from 'solid-js';
import type { DynamicProps } from 'solid-js/web';
import type { ReactLikeRef } from '../solid-helpers';

export type UseRenderElementRef<T> =
  | ((el: T | null | undefined) => void)
  | ReactLikeRef<T | null | undefined>;

type InferRefElement<R> = R extends (el: infer E) => void
  ? E
  : R extends { current: infer E }
    ? E
    : R;
type IntrinsicRefElement<T> = T extends keyof JSX.IntrinsicElements
  ? InferRefElement<ComponentProps<T>['ref']>
  : Element;

export type HTMLProps<T = any> = JSX.HTMLAttributes<T>;
export type BaseUIHTMLProps<T = any> = WithBaseUIEvent<JSX.HTMLAttributes<T>>;

export interface FloatingUIOpenChangeDetails {
  open: boolean;
  reason: string;
  nativeEvent: Event;
  nested: boolean;
  triggerElement?: Element | undefined;
}

export type BaseUIEvent<E extends Event> = E & {
  preventBaseUIHandler: () => void;
  readonly baseUIHandlerPrevented?: boolean | undefined;
};

type WithPreventBaseUIHandler<T, K extends keyof T> = T[K] extends
  | JSX.EventHandlerUnion<infer TT, infer E>
  | undefined
  ? JSX.EventHandlerUnion<TT, BaseUIEvent<E>>
  : T[K] extends JSX.EventHandlerWithOptionsUnion<infer TT, infer E> | undefined
    ? JSX.EventHandlerWithOptionsUnion<TT, BaseUIEvent<E>>
    : T[K] extends JSX.EventHandler<infer TT, infer E> | undefined
      ? JSX.EventHandler<TT, BaseUIEvent<E>>
      : T[K];

/**
 * Adds a `preventBaseUIHandler` method to all event handlers.
 */
// export type WithBaseUIEvent<T> = T;
export type WithBaseUIEvent<T> = {
  [K in keyof T]: WithPreventBaseUIHandler<T, K>;
};

/**
 * Shape of the render prop: a function that takes props to be spread on the element and component's state and returns a React element.
 *
 * @template Props Props to be spread on the rendered element.
 * @template State Component's internal state.
 */
export type ComponentRenderFn<Props, State> = (props: Props, state: State) => JSX.Element;

/**
 * Props shared by all Base UI components.
 * Contains `class` (string or callback taking the component's state as an argument) and `render` (function to customize rendering).
 *
 * TODO: Removing usage of Omit sped up tsserver, presumably because it doesn't need to iterate each property of the DOM element
 */
export type BaseUIComponentProps<
  ElementType extends keyof JSX.IntrinsicElements | undefined,
  State,
  RenderFnElement extends ValidComponent = ValidComponent,
> = WithBaseUIEvent<
  ElementType extends keyof JSX.IntrinsicElements
    ? Omit<ComponentProps<ElementType>, 'class' | 'style' | 'ref'>
    : Omit<JSX.HTMLAttributes<any>, 'class' | 'style' | 'ref'>
> & {
  ref?: UseRenderElementRef<IntrinsicRefElement<ElementType>> | undefined;
  /**
   * CSS class applied to the element, or a function that
   * returns a class based on the component’s state.
   */
  class?: (string | ((state: State) => string | undefined)) | undefined;
  /**
   * Allows you to replace the component’s HTML element
   * with a different tag, or compose it with another component.
   *
   * Accepts a `ReactElement` or a function that returns the element to render.
   */
  render?:
    | (
        | keyof JSX.IntrinsicElements
        | DynamicProps<RenderFnElement>
        | ComponentRenderFn<JSX.HTMLAttributes<any>, State>
        | null
      )
    | undefined;
  /**
   * Style applied to the element, or a function that
   * returns a style object based on the component’s state.
   */
  style?: (JSX.CSSProperties | ((state: State) => JSX.CSSProperties | undefined)) | undefined;
};

export interface NativeButtonProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (e.g. `<div>`).
   * @default true
   */
  nativeButton?: boolean | undefined;
}

export interface NonNativeButtonProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `true` if the rendered element is a native button.
   * @default false
   */
  nativeButton?: boolean | undefined;
}

/**
 * Simplifies the display of a type (without modifying it).
 * Taken from https://effectivetypescript.com/2022/02/25/gentips-4-display/
 */
export type Simplify<T> = T extends Function ? T : { [K in keyof T]: T[K] };

export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>;

export type Orientation = 'horizontal' | 'vertical';
