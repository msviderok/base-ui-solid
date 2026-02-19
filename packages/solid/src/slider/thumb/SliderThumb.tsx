import { createEffect, createMemo, createSignal, type JSX, on, onMount } from 'solid-js';
import {
  ARROW_DOWN,
  ARROW_LEFT,
  ARROW_RIGHT,
  ARROW_UP,
  COMPOSITE_KEYS,
  END,
  HOME,
} from '../../composite/composite';
import { useCompositeListItem } from '../../composite/list/useCompositeListItem';
import { useCSPContext } from '../../csp-provider/CSPContext';
import { useDirection } from '../../direction-provider/DirectionContext';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { type LabelableContext } from '../../labelable-provider/LabelableContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { mergeProps } from '../../merge-props';
import { callEventHandler, splitComponentProps } from '../../solid-helpers';
import { formatNumber } from '../../utils/formatNumber';
import { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { valueToPercent } from '../../utils/valueToPercent';
import { visuallyHidden } from '../../utils/visuallyHidden';
import type { SliderRoot } from '../root/SliderRoot';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import { getMidpoint } from '../utils/getMidpoint';
import { getSliderValue } from '../utils/getSliderValue';
import { roundValueToStep } from '../utils/roundValueToStep';
import { script as prehydrationScript } from './prehydrationScript.min';
import { SliderThumbDataAttributes } from './SliderThumbDataAttributes';

const PAGE_UP = 'PageUp';
const PAGE_DOWN = 'PageDown';

const ALL_KEYS = new Set([
  ARROW_UP,
  ARROW_DOWN,
  ARROW_LEFT,
  ARROW_RIGHT,
  HOME,
  END,
  PAGE_UP,
  PAGE_DOWN,
]);

function getDefaultAriaValueText(
  values: readonly number[],
  index: number,
  format: Intl.NumberFormatOptions | undefined,
  locale: Intl.LocalesArgument | undefined,
): string | undefined {
  if (index < 0) {
    return undefined;
  }

  if (values.length === 2) {
    if (index === 0) {
      return `${formatNumber(values[index], locale, format)} start range`;
    }

    return `${formatNumber(values[index], locale, format)} end range`;
  }

  return format ? formatNumber(values[index], locale, format) : undefined;
}

function getNewValue(
  thumbValue: number,
  step: number,
  direction: 1 | -1,
  min: number,
  max: number,
): number {
  return direction === 1 ? Math.min(thumbValue + step, max) : Math.max(thumbValue - step, min);
}

/**
 * The draggable part of the the slider at the tip of the indicator.
 * Renders a `<div>` element and a nested `<input type="range">`.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderThumb(componentProps: SliderThumb.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'aria-describedby',
    'aria-label',
    'aria-labelledby',
    'disabled',
    'getAriaLabel',
    'getAriaValueText',
    'id',
    'index',
    'inputRef',
    'onBlur',
    'onFocus',
    'onKeyDown',
    'tabIndex',
  ]);
  const ariaDescribedByProp = () => local['aria-describedby'];
  const ariaLabelProp = () => local['aria-label'];
  const ariaLabelledByProp = () => local['aria-labelledby'];
  const disabledProp = () => local.disabled ?? false;
  const idProp = () => local.id;
  const indexProp = () => local.index;
  const tabIndexProp = () => local.tabIndex;

  const { nonce } = useCSPContext();
  const id = useBaseUiId(idProp);

  const {
    active: activeIndex,
    lastUsedThumbIndex,
    disabled: contextDisabled,
    validation,
    refs,
    handleInputChange,
    inset,
    labelId,
    largeStep,
    locale,
    max,
    min,
    minStepsBetweenValues,
    name,
    orientation,
    renderBeforeHydration,
    setActive,
    setIndicatorPosition,
    state,
    step,
    values: sliderValues,
  } = useSliderRootContext();

  const direction = useDirection();

  const disabled = () => disabledProp() || contextDisabled();
  const range = () => sliderValues().length > 1;
  const vertical = () => orientation() === 'vertical';
  const rtl = () => direction() === 'rtl';

  const { setTouched, setFocused, validationMode } = useFieldRootContext();

  let thumbRef = null as HTMLElement | null | undefined;
  let inputRef = null as HTMLInputElement | null | undefined;

  const defaultInputId = useBaseUiId();
  const labelableId = useLabelableId();
  const inputId = () => (range() ? defaultInputId() : labelableId());

  const thumbMetadata = { inputId };

  const { setRef: setListItemRef, index: compositeIndex } = useCompositeListItem<ThumbMetadata>({
    metadata: thumbMetadata,
  });

  const index = () => (!range() ? 0 : (indexProp() ?? compositeIndex()));
  const last = () => index() === sliderValues().length - 1;
  const thumbValue = () => sliderValues()[index()];

  const thumbValuePercent = () => valueToPercent(thumbValue(), min(), max());

  const [isMounted, setIsMounted] = createSignal(false);
  const [positionPercent, setPositionPercent] = createSignal<number | undefined>();

  onMount(() => setIsMounted(true));

  const safeLastUsedThumbIndex = () =>
    lastUsedThumbIndex() >= 0 && lastUsedThumbIndex() < sliderValues().length
      ? lastUsedThumbIndex()
      : -1;

  const getInsetPosition = () => {
    const control = refs.controlRef;
    const thumb = thumbRef;
    if (!control || !thumb) {
      return;
    }
    const thumbRect = thumb.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();

    const side = vertical() ? 'height' : 'width';
    // the total travel distance adjusted to account for the thumb size
    const controlSize = controlRect[side] - thumbRect[side];
    // px distance from the starting edge (inline-start or bottom) to the thumb center
    const thumbOffsetFromControlEdge =
      thumbRect[side] / 2 + (controlSize * thumbValuePercent()) / 100;
    const nextPositionPercent = (thumbOffsetFromControlEdge / controlRect[side]) * 100;
    setPositionPercent(nextPositionPercent);
    if (index() === 0) {
      setIndicatorPosition((prevPosition) => [nextPositionPercent, prevPosition[1]]);
    } else if (last()) {
      setIndicatorPosition((prevPosition) => [prevPosition[0], nextPositionPercent]);
    }
  };

  createEffect(
    on(inset, (insetVal) => {
      if (insetVal) {
        queueMicrotask(getInsetPosition);
      }
    }),
  );

  createEffect(
    on([inset, thumbValuePercent], ([insetVal]) => {
      if (insetVal) {
        getInsetPosition();
      }
    }),
  );

  const getThumbStyle = () => {
    const startEdge = vertical() ? 'bottom' : 'inset-inline-start';
    const crossOffsetProperty = vertical() ? 'left' : 'top';

    let zIndex: number | undefined;
    if (range()) {
      if (activeIndex() === index()) {
        zIndex = 2;
      } else if (safeLastUsedThumbIndex() === index()) {
        zIndex = 1;
      }
    } else if (activeIndex() === index()) {
      zIndex = 1;
    }

    if (!inset()) {
      if (!Number.isFinite(thumbValuePercent())) {
        return visuallyHidden;
      }

      return {
        position: 'absolute',
        [startEdge]: `${thumbValuePercent()}%`,
        [crossOffsetProperty]: '50%',
        translate: `${(vertical() || !rtl() ? -1 : 1) * 50}% ${(vertical() ? 1 : -1) * 50}%`,
        'z-index': zIndex,
      } satisfies JSX.CSSProperties;
    }

    return {
      ['--position' as string]: `${positionPercent()}%`,
      visibility:
        (renderBeforeHydration() && !isMounted()) || positionPercent() === undefined
          ? 'hidden'
          : undefined,
      position: 'absolute',
      [startEdge]: 'var(--position)',
      [crossOffsetProperty]: '50%',
      translate: `${(vertical() || !rtl() ? -1 : 1) * 50}% ${(vertical() ? 1 : -1) * 50}%`,
      'z-index': zIndex,
    } satisfies JSX.CSSProperties;
  };

  const cssWritingMode = createMemo<JSX.CSSProperties['writing-mode']>(() => {
    if (orientation() === 'vertical') {
      return rtl() ? 'vertical-rl' : 'vertical-lr';
    }
    return undefined;
  });

  const inputProps = mergeProps<'input'>(
    {
      get 'aria-label'() {
        return typeof local.getAriaLabel === 'function'
          ? local.getAriaLabel(index())
          : ariaLabelProp();
      },
      get 'aria-labelledby'() {
        return ariaLabelledByProp() ?? labelId();
      },
      get 'aria-describedby'() {
        return ariaDescribedByProp();
      },
      get 'aria-orientation'() {
        return orientation();
      },
      get 'aria-valuenow'() {
        return thumbValue();
      },
      get 'aria-valuetext'() {
        return typeof local.getAriaValueText === 'function'
          ? local.getAriaValueText(
              formatNumber(thumbValue(), locale(), refs.formatOptionsRef ?? undefined),
              thumbValue(),
              index(),
            )
          : getDefaultAriaValueText(
              sliderValues(),
              index(),
              refs.formatOptionsRef ?? undefined,
              locale(),
            );
      },
      get disabled() {
        return disabled();
      },
      get id() {
        return inputId();
      },
      get max() {
        return max();
      },
      get min() {
        return min();
      },
      get name() {
        return name();
      },
      onChange(event) {
        handleInputChange(event.target.valueAsNumber, index(), event as any);
      },
      onFocus() {
        setActive(index());
        setFocused(true);
      },
      onBlur() {
        if (!thumbRef) {
          return;
        }

        setActive(-1);
        setTouched(true);
        setFocused(false);

        if (validationMode() === 'onBlur') {
          validation.commit(
            getSliderValue(thumbValue(), index(), min(), max(), range(), sliderValues()),
          );
        }
      },
      onKeyDown(event) {
        if (!ALL_KEYS.has(event.key)) {
          return;
        }
        if (COMPOSITE_KEYS.has(event.key)) {
          event.stopPropagation();
        }

        let newValue = null;
        const roundedValue = roundValueToStep(thumbValue(), step(), min());
        switch (event.key) {
          case ARROW_UP:
            newValue = getNewValue(
              roundedValue,
              event.shiftKey ? largeStep() : step(),
              1,
              min(),
              max(),
            );
            break;
          case ARROW_RIGHT:
            newValue = getNewValue(
              roundedValue,
              event.shiftKey ? largeStep() : step(),
              rtl() ? -1 : 1,
              min(),
              max(),
            );
            break;
          case ARROW_DOWN:
            newValue = getNewValue(
              roundedValue,
              event.shiftKey ? largeStep() : step(),
              -1,
              min(),
              max(),
            );
            break;
          case ARROW_LEFT:
            newValue = getNewValue(
              roundedValue,
              event.shiftKey ? largeStep() : step(),
              rtl() ? 1 : -1,
              min(),
              max(),
            );
            break;
          case PAGE_UP:
            newValue = getNewValue(roundedValue, largeStep(), 1, min(), max());
            break;
          case PAGE_DOWN:
            newValue = getNewValue(roundedValue, largeStep(), -1, min(), max());
            break;
          case END:
            newValue = max();

            if (range()) {
              newValue = Number.isFinite(sliderValues()[index() + 1])
                ? sliderValues()[index() + 1] - step() * minStepsBetweenValues()
                : max();
            }
            break;
          case HOME:
            newValue = min();

            if (range()) {
              newValue = Number.isFinite(sliderValues()[index() - 1])
                ? sliderValues()[index() - 1] + step() * minStepsBetweenValues()
                : min();
            }
            break;
          default:
            break;
        }

        if (newValue !== null) {
          handleInputChange(newValue, index(), event);
          event.preventDefault();
        }
      },
      get step() {
        return step();
      },
      get style() {
        return {
          ...visuallyHidden,
          // So that VoiceOver's focus indicator matches the thumb's dimensions
          width: '100%',
          height: '100%',
          'writing-mode': cssWritingMode(),
        };
      },
      get tabIndex() {
        return tabIndexProp() ?? undefined;
      },
      type: 'range',
      get value() {
        return thumbValue() ?? '';
      },
    },
    validation.getInputValidationProps,
  );

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      setListItemRef(el);
      thumbRef = el;
    },
    props: [
      {
        get [SliderThumbDataAttributes.index as string]() {
          return index();
        },
        get id() {
          return id();
        },
        onBlur(event) {
          callEventHandler(local.onBlur, event as any);
        },
        onFocus(event) {
          callEventHandler(local.onFocus, event as any);
        },
        onPointerDown(event) {
          refs.pressedThumbIndexRef = index();

          if (thumbRef != null) {
            const axis = orientation() === 'horizontal' ? 'x' : 'y';
            const midpoint = getMidpoint(thumbRef);
            const offset =
              (orientation() === 'horizontal' ? event.clientX : event.clientY) - midpoint[axis];
            refs.pressedThumbCenterOffsetRef = offset;
          }

          if (inputRef != null && refs.pressedInputRef !== inputRef) {
            refs.pressedInputRef = inputRef;
          }
        },
        get style() {
          return getThumbStyle();
        },
        // @ts-expect-error - suppressHydrationWarning is not a valid attribute in SolidJS
        get suppressHydrationWarning() {
          return renderBeforeHydration() || undefined;
        },
        tabIndex: -1,
      },
      elementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
    get children() {
      return (
        <>
          {/* {componentProps.render == null ? (
            <>
              {thumbProps.children ?? componentProps.children}
              <input {...(inputProps as any)} />
            </>
          ) : undefined} */}
          {elementProps.children}
          <input
            ref={(el) => {
              if (typeof componentProps.ref === 'function') {
                componentProps.ref(el);
              } else {
                componentProps.ref = el;
              }
              setListItemRef(el);
              local.inputRef = el;
            }}
            {...(inputProps as any)}
          />
          {inset() &&
            !isMounted() &&
            renderBeforeHydration() &&
            // this must be rendered with the last thumb to ensure all
            // preceding thumbs are already rendered in the DOM
            last() && (
              <script
                nonce={nonce()}
                // eslint-disable-next-line solid/no-innerhtml
                innerHTML={prehydrationScript}
                // @ts-expect-error - suppressHydrationWarning is not a valid attribute in SolidJS
                suppressHydrationWarning
              />
            )}
        </>
      );
    },
  });

  return <>{element()}</>;
}

export interface ThumbMetadata {
  inputId: LabelableContext['controlId'];
}

export interface SliderThumbState extends SliderRoot.State {}

export interface SliderThumbProps extends BaseUIComponentProps<'div', SliderThumb.State> {
  /**
   * Whether the thumb should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A function which returns a string value for the [`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label) attribute of the `input`.
   */
  getAriaLabel?: (((index: number) => string) | null) | undefined;
  /**
   * A function which returns a string value for the [`aria-valuetext`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-valuetext) attribute of the `input`.
   * This is important for screen reader users.
   */
  getAriaValueText?:
    | (((formattedValue: string, value: number, index: number) => string) | null)
    | undefined;
  /**
   * The index of the thumb which corresponds to the index of its value in the
   * `value` or `defaultValue` array.
   * This prop is required to support server-side rendering for range sliders
   * with multiple thumbs.
   * @example
   * ```tsx
   * <Slider.Root value={[10, 20]}>
   *   <Slider.Thumb index={0} />
   *   <Slider.Thumb index={1} />
   * </Slider.Root>
   * ```
   */
  index?: number | undefined;
  /**
   * A ref to access the nested input element.
   */
  inputRef?: (HTMLInputElement | null) | undefined;
  /**
   * Optional tab index attribute forwarded to the `input`.
   */
  tabIndex?: number | undefined;
}

export namespace SliderThumb {
  export type State = SliderThumbState;
  export type Props = SliderThumbProps;
}
