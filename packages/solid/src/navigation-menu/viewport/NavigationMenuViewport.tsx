import { splitComponentProps } from '@msviderok/base-ui-solid/solid-helpers';
import { createEffect, Show, type JSX } from 'solid-js';
import {
  contains,
  getNextTabbable,
  getPreviousTabbable,
  isOutsideEvent,
} from '../../floating-ui-solid/utils';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import { FocusGuard } from '../../utils/FocusGuard';
import type { BaseUIComponentProps } from '../../utils/types';
import { useId } from '../../utils/useId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useNavigationMenuPositionerContext } from '../positioner/NavigationMenuPositionerContext';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

const EMPTY_ROOT_CONTEXT = getEmptyRootContext();

function Guards(props: { children: JSX.Element }) {
  const { refs, positionerElement, viewportElement, floatingRootContext } =
    useNavigationMenuRootContext();
  const hasPositioner = () => Boolean(useNavigationMenuPositionerContext(true));

  const referenceElement = () => positionerElement() || viewportElement();

  return (
    <Show when={floatingRootContext() || hasPositioner()} fallback={props.children}>
      <FocusGuard
        ref={(el) => {
          refs.beforeInsideRef = el;
        }}
        onFocus={(event) => {
          const el = referenceElement();
          if (el && isOutsideEvent(event, el)) {
            getNextTabbable(el)?.focus();
          } else {
            refs.beforeOutsideRef?.focus();
          }
        }}
      />
      {props.children}
      <FocusGuard
        ref={(el) => {
          refs.afterInsideRef = el;
        }}
        onFocus={(event) => {
          const el = referenceElement();
          if (el && isOutsideEvent(event, el)) {
            getPreviousTabbable(el)?.focus();
          } else {
            refs.afterOutsideRef?.focus();
          }
        }}
      />
    </Show>
  );
}

/**
 * The clipping viewport of the navigation menu's current content.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */

export function NavigationMenuViewport(componentProps: NavigationMenuViewport.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['children', 'id']);
  const idProp = () => local.id;

  const id = useId(idProp);

  const {
    setViewportElement,
    setViewportTargetElement,
    floatingRootContext,
    refs,
    viewportInert,
    setViewportInert,
  } = useNavigationMenuRootContext();

  const hasPositioner = () => Boolean(useNavigationMenuPositionerContext(true));
  const domReference = () =>
    (floatingRootContext() || EMPTY_ROOT_CONTEXT).useState('domReferenceElement')();

  createEffect(() => {
    const ref = domReference();
    if (ref) {
      refs.prevTriggerElementRef = ref;
    }
  });

  const element = useRenderElement('div', componentProps, {
    ref: setViewportElement,
    props: [
      {
        get id() {
          return id();
        },
        onBlur(event) {
          const relatedTarget = event.relatedTarget as Element | null;
          const currentTarget = event.currentTarget as Element;

          // If focus is leaving the viewport and not going to the trigger, make it inert
          // to prevent a focus loop.
          if (
            relatedTarget &&
            !contains(currentTarget, relatedTarget) &&
            relatedTarget !== domReference()
          ) {
            setViewportInert(true);
          }
        },
        get inert() {
          return !hasPositioner() && viewportInert() ? true : undefined;
        },
      },
      elementProps,
    ],
    get children() {
      return (
        <Show when={!hasPositioner()} fallback={local.children}>
          <Guards>
            <div ref={setViewportTargetElement}>{local.children}</div>
          </Guards>
        </Show>
      );
    },
  });

  return (
    <Show when={hasPositioner()} fallback={element()}>
      <Guards>{element()}</Guards>
    </Show>
  );
}

export interface NavigationMenuViewportState {}

export interface NavigationMenuViewportProps extends BaseUIComponentProps<
  'div',
  NavigationMenuViewport.State
> {}

export namespace NavigationMenuViewport {
  export type State = NavigationMenuViewportState;
  export type Props = NavigationMenuViewportProps;
}
