import { AnimationFrame } from '@base-ui/utils/useAnimationFrame';
import { warn } from '@base-ui/utils/warn';
import {
  createEffect,
  createMemo,
  on,
  onCleanup,
  onMount,
  Setter,
  type Accessor,
  type JSX,
} from 'solid-js';
import { AccordionRootDataAttributes } from '../../accordion/root/AccordionRootDataAttributes';
import { access, type MaybeAccessor } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { HTMLProps } from '../../utils/types';
import { useAnimationFrame } from '../../utils/useAnimationFrame';
import type { CollapsibleRoot } from '../root/CollapsibleRoot';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import type { AnimationType, Dimensions } from '../root/useCollapsibleRoot';
import { CollapsiblePanelDataAttributes } from './CollapsiblePanelDataAttributes';

export function useCollapsiblePanel(
  parameters: useCollapsiblePanel.Parameters,
): useCollapsiblePanel.ReturnValue {
  const height = () => access(parameters.height);
  const hiddenUntilFound = () => access(parameters.hiddenUntilFound);
  const id = () => access(parameters.id);
  const keepMounted = () => access(parameters.keepMounted);
  const mounted = () => access(parameters.mounted);
  const open = () => access(parameters.open);
  const visible = () => access(parameters.visible);
  const width = () => access(parameters.width);
  const { setCodependentRefs } = useCollapsibleRootContext();

  let ref: HTMLElement | undefined;
  let isBeforeMatchRef = false;
  let latestAnimationNameRef = null as string | null;
  let shouldCancelInitialOpenAnimationRef = open();
  let shouldCancelInitialOpenTransitionRef = open();

  const endingStyleFrame = useAnimationFrame();

  /**
   * When opening, the `hidden` attribute is removed immediately.
   * When closing, the `hidden` attribute is set after any exit animations runs.
   */
  const hidden = createMemo(() => {
    if (parameters.animationType() === 'css-animation') {
      return !visible();
    }

    return !open() && !mounted();
  });

  /**
   * When `keepMounted` is `true` this runs once as soon as it exists in the DOM
   * regardless of initial open state.
   *
   * When `keepMounted` is `false` this runs on every mount, typically every
   * time it opens. If the panel is in the middle of a close transition that is
   * interrupted and re-opens, this won't run as the panel was not unmounted.
   */
  function handlePanelRef(element: HTMLElement) {
    if (!element) {
      return;
    }
    if (parameters.animationType() == null || parameters.transitionDimension() == null) {
      const panelStyles = getComputedStyle(element);

      const hasAnimation = panelStyles.animationName !== 'none' && panelStyles.animationName !== '';
      const hasTransition =
        panelStyles.transitionDuration !== '0s' && panelStyles.transitionDuration !== '';

      /**
       * animationType is safe to read in render because it's only ever set
       * once here during the first render and never again.
       * https://react.dev/learn/referencing-values-with-refs#best-practices-for-refs
       */
      if (hasAnimation && hasTransition) {
        if (process.env.NODE_ENV !== 'production') {
          warn(
            'CSS transitions and CSS animations both detected on Collapsible or Accordion panel.',
            'Only one of either animation type should be used.',
          );
        }
      } else if (panelStyles.animationName === 'none' && panelStyles.transitionDuration !== '0s') {
        parameters.setAnimationType('css-transition');
      } else if (panelStyles.animationName !== 'none' && panelStyles.transitionDuration === '0s') {
        parameters.setAnimationType('css-animation');
      } else {
        parameters.setAnimationType('none');
      }

      /**
       * We need to know in advance which side is being collapsed when using CSS
       * transitions in order to set the value of width/height to `0px` momentarily.
       * Setting both to `0px` will break layout.
       */
      if (
        element.getAttribute(AccordionRootDataAttributes.orientation) === 'horizontal' ||
        panelStyles.transitionProperty.indexOf('width') > -1
      ) {
        parameters.setTransitionDimension('width');
      } else {
        parameters.setTransitionDimension('height');
      }
    }

    if (parameters.animationType() !== 'css-transition') {
      return;
    }

    if (height() === undefined || width() === undefined) {
      parameters.setDimensions({ height: element.scrollHeight, width: element.scrollWidth });

      if (shouldCancelInitialOpenTransitionRef) {
        element.style.setProperty('transition-duration', '0s');
      }
    }

    let frame = -1;
    let nextFrame = -1;

    frame = AnimationFrame.request(() => {
      shouldCancelInitialOpenTransitionRef = false;
      nextFrame = AnimationFrame.request(() => {
        /**
         * This is slightly faster than another RAF and is the earliest
         * opportunity to remove the temporary `transition-duration: 0s` that
         * was applied to cancel opening transitions of initially open panels.
         * https://nolanlawson.com/2018/09/25/accurately-measuring-layout-on-the-web/
         */
        setTimeout(() => {
          element.style.removeProperty('transition-duration');
        });
      });
    });

    onCleanup(() => {
      AnimationFrame.cancel(frame);
      AnimationFrame.cancel(nextFrame);
    });
  }

  createEffect(
    on(
      [
        parameters.animationType,
        hiddenUntilFound,
        keepMounted,
        mounted,
        open,
        parameters.transitionDimension,
      ],
      () => {
        if (parameters.animationType() !== 'css-transition') {
          return;
        }

        const panel = parameters.refs.panelRef;

        if (!panel) {
          return;
        }

        let resizeFrame = -1;

        if (parameters.refs.abortControllerRef != null) {
          parameters.refs.abortControllerRef.abort();
          parameters.refs.abortControllerRef = null;
        }

        if (open()) {
          const originalLayoutStyles = {
            'justify-content': panel.style.justifyContent,
            'align-items': panel.style.alignItems,
            'align-content': panel.style.alignContent,
            'justify-items': panel.style.justifyItems,
          };
          /* opening */
          Object.keys(originalLayoutStyles).forEach((key) => {
            panel.style.setProperty(key, 'initial', 'important');
          });

          /**
           * When `keepMounted={false}` and the panel is initially closed, the very
           * first time it opens (not any subsequent opens) `data-starting-style` is
           * off or missing by a frame so we need to set it manually. Otherwise any
           * CSS properties expected to transition using [data-starting-style] may
           * be mis-timed and appear to be complete skipped.
           */
          if (!shouldCancelInitialOpenTransitionRef && !keepMounted()) {
            panel.setAttribute(CollapsiblePanelDataAttributes.startingStyle, '');
          }

          parameters.setDimensions({ height: panel.scrollHeight, width: panel.scrollWidth });

          resizeFrame = AnimationFrame.request(() => {
            Object.entries(originalLayoutStyles).forEach(([key, value]) => {
              if (value === '') {
                panel.style.removeProperty(key);
              } else {
                panel.style.setProperty(key, value);
              }
            });
          });
        } else {
          if (panel.scrollHeight === 0 && panel.scrollWidth === 0) {
            return;
          }

          /* closing */
          parameters.setDimensions({ height: panel.scrollHeight, width: panel.scrollWidth });

          const abortController = new AbortController();
          parameters.refs.abortControllerRef = abortController;
          const signal = abortController.signal;

          let attributeObserver: MutationObserver | null = null;

          const endingStyleAttribute = CollapsiblePanelDataAttributes.endingStyle;

          // Wait for `[data-ending-style]` to be applied.
          attributeObserver = new MutationObserver((mutationList) => {
            const hasEndingStyle = mutationList.some(
              (mutation) =>
                mutation.type === 'attributes' && mutation.attributeName === endingStyleAttribute,
            );

            if (hasEndingStyle) {
              attributeObserver?.disconnect();
              attributeObserver = null;
              parameters.runOnceAnimationsFinish(() => {
                parameters.setDimensions({ height: 0, width: 0 });
                panel.style.removeProperty('content-visibility');
                parameters.setMounted(false);
                if (parameters.refs.abortControllerRef === abortController) {
                  parameters.refs.abortControllerRef = null;
                }
              }, signal);
            }
          });

          attributeObserver.observe(panel, {
            attributes: true,
            attributeFilter: [endingStyleAttribute],
          });

          onCleanup(() => {
            attributeObserver?.disconnect();
            endingStyleFrame.cancel();
            if (parameters.refs.abortControllerRef === abortController) {
              abortController.abort();
              parameters.refs.abortControllerRef = null;
            }
          });
          return;
        }

        onCleanup(() => {
          AnimationFrame.cancel(resizeFrame);
        });
      },
    ),
  );

  createEffect(() => {
    if (parameters.animationType() !== 'css-animation') {
      return;
    }

    const panel = parameters.refs.panelRef;
    if (!panel) {
      return;
    }

    latestAnimationNameRef = panel.style.animationName || latestAnimationNameRef;

    panel.style.setProperty('animation-name', 'none');

    parameters.setDimensions({ height: panel.scrollHeight, width: panel.scrollWidth });

    if (!shouldCancelInitialOpenAnimationRef && !isBeforeMatchRef) {
      panel.style.removeProperty('animation-name');
    }

    if (open()) {
      if (parameters.refs.abortControllerRef != null) {
        parameters.refs.abortControllerRef.abort();
        parameters.refs.abortControllerRef = null;
      }
      parameters.setMounted(true);
      parameters.setVisible(true);
    } else {
      parameters.refs.abortControllerRef = new AbortController();
      parameters.runOnceAnimationsFinish(() => {
        parameters.setMounted(false);
        parameters.setVisible(false);
        parameters.refs.abortControllerRef = null;
      }, parameters.refs.abortControllerRef.signal);
    }
  });

  onMount(() => {
    const frame = AnimationFrame.request(() => {
      shouldCancelInitialOpenAnimationRef = false;
    });
    onCleanup(() => AnimationFrame.cancel(frame));
  });

  createEffect(() => {
    if (!hiddenUntilFound()) {
      return;
    }

    const panel = parameters.refs.panelRef;
    if (!panel) {
      return;
    }

    let frame = -1;
    let nextFrame = -1;

    if (open() && isBeforeMatchRef) {
      panel.style.transitionDuration = '0s';
      parameters.setDimensions({ height: panel.scrollHeight, width: panel.scrollWidth });
      frame = AnimationFrame.request(() => {
        isBeforeMatchRef = false;
        nextFrame = AnimationFrame.request(() => {
          setTimeout(() => {
            panel.style.removeProperty('transition-duration');
          });
        });
      });
    }

    onCleanup(() => {
      AnimationFrame.cancel(frame);
      AnimationFrame.cancel(nextFrame);
    });
  });

  createEffect(() => {
    const panel = parameters.refs.panelRef;

    if (panel && hiddenUntilFound() && hidden()) {
      /**
       * React only supports a boolean for the `hidden` attribute and forces
       * legit string values to booleans so we have to force it back in the DOM
       * when necessary: https://github.com/facebook/react/issues/24740
       */
      panel.setAttribute('hidden', 'until-found');
      /**
       * Set data-starting-style here to persist the closed styles, this is to
       * prevent transitions from starting when the `hidden` attribute changes
       * to `'until-found'` as they could have different `display` properties:
       * https://github.com/tailwindlabs/tailwindcss/pull/14625
       */
      if (parameters.animationType() === 'css-transition') {
        panel.setAttribute(CollapsiblePanelDataAttributes.startingStyle, '');
      }
    }
  });

  createEffect(function registerBeforeMatchListener() {
    const panel = parameters.refs.panelRef;
    if (!panel) {
      return;
    }

    function handleBeforeMatch(event: Event) {
      isBeforeMatchRef = true;
      parameters.setOpen(true);
      parameters.onOpenChange(true, createChangeEventDetails(REASONS.none, event));
    }

    panel.addEventListener('beforematch', handleBeforeMatch);
    onCleanup(() => {
      panel.removeEventListener('beforematch', handleBeforeMatch);
    });
  });

  onMount(() => {
    setCodependentRefs('panel', {
      explicitId: () => undefined,
      ref: () => ref,
      id: () => access(parameters.id),
    });
  });

  return {
    setRef: (el) => {
      ref = el;
      /**
       * TODO: putting it into onMount seems to properly time the measurement.
       * Otherwise the ref is set slightly too early.
       */
      onMount(() => handlePanelRef(el));
    },
    props: {
      get hidden() {
        return hidden();
      },
      get id() {
        return id();
      },
    },
  };
}

export interface UseCollapsiblePanelParameters {
  animationType: Accessor<AnimationType>;
  setAnimationType: Setter<AnimationType>;
  /**
   * The height of the panel.
   */
  height: MaybeAccessor<number | undefined>;
  /**
   * Allows the browser’s built-in page search to find and expand the panel contents.
   *
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   */
  hiddenUntilFound: MaybeAccessor<boolean>;
  /**
   * The `id` attribute of the panel.
   */
  id: MaybeAccessor<JSX.HTMLAttributes<Element>['id']>;
  /**
   * Whether to keep the element in the DOM while the panel is closed.
   * This prop is ignored when `hiddenUntilFound` is used.
   */
  keepMounted: MaybeAccessor<boolean>;
  /**
   * Whether the collapsible panel is currently mounted.
   */
  mounted: MaybeAccessor<boolean>;
  onOpenChange: (open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void;
  /**
   * Whether the collapsible panel is currently open.
   */
  open: MaybeAccessor<boolean>;
  refs: {
    abortControllerRef: AbortController | null;
    panelRef: HTMLElement | null | undefined;
  };
  runOnceAnimationsFinish: (fnToExecute: () => void, signal?: AbortSignal | null) => void;
  setDimensions: (nextDimensions: Dimensions) => void;
  setMounted: (nextMounted: boolean) => void;
  setOpen: (nextOpen: boolean) => void;
  setVisible: (nextVisible: boolean) => void;
  transitionDimension: Accessor<'height' | 'width' | null>;
  setTransitionDimension: Setter<'height' | 'width' | null>;
  /**
   * The visible state of the panel used to determine the `[hidden]` attribute
   * only when CSS keyframe animations are used.
   */
  visible: MaybeAccessor<boolean>;
  /**
   * The width of the panel.
   */
  width: MaybeAccessor<number | undefined>;
}

export interface UseCollapsiblePanelReturnValue {
  setRef: (el: HTMLElement) => void;
  props: HTMLProps;
}

export namespace useCollapsiblePanel {
  export type Parameters = UseCollapsiblePanelParameters;
  export type ReturnValue = UseCollapsiblePanelReturnValue;
}
