import { createMemo, createSignal, type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { formatNumberValue } from '../../utils/formatNumber';
import { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { ProgressRootContext } from './ProgressRootContext';
import { progressStateAttributesMapping } from './stateAttributesMapping';

function getDefaultAriaValueText(formattedValue: string | null, value: number | null) {
  if (value == null) {
    return 'indeterminate progress';
  }

  return formattedValue || `${value}%`;
}

/**
 * Groups all parts of the progress bar and provides the task completion status to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressRoot(componentProps: ProgressRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'format',
    'getAriaValueText',
    'locale',
    'max',
    'min',
    'value',
  ]);
  const max = () => local.max ?? 100;
  const min = () => local.min ?? 0;
  const getAriaValueText: typeof local.getAriaValueText = (...args) =>
    (local.getAriaValueText ?? getDefaultAriaValueText)(...args);

  const [labelId, setLabelId] = createSignal<string | undefined>();

  const status = createMemo<ProgressStatus>(() => {
    if (Number.isFinite(local.value)) {
      return local.value === max() ? 'complete' : 'progressing';
    }

    return 'indeterminate';
  });

  const formattedValue = () => formatNumberValue(local.value, local.locale, local.format);

  const state: ProgressRoot.State = {
    get status() {
      return status();
    },
  };

  const defaultProps: HTMLProps = {
    get 'aria-labelledby'() {
      return labelId();
    },
    get 'aria-valuemax'() {
      return max();
    },
    get 'aria-valuemin'() {
      return min();
    },
    get 'aria-valuenow'() {
      return local.value ?? undefined;
    },
    get 'aria-valuetext'() {
      return getAriaValueText(formattedValue(), local.value);
    },
    role: 'progressbar',
  };

  const contextValue: ProgressRootContext = {
    formattedValue,
    max,
    min,
    setLabelId,
    state,
    status,
    value: () => local.value,
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: [defaultProps, elementProps],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return (
    <ProgressRootContext.Provider value={contextValue}>{element()}</ProgressRootContext.Provider>
  );
}

export type ProgressStatus = 'indeterminate' | 'progressing' | 'complete';

export interface ProgressRootState {
  status: ProgressStatus;
}

export interface ProgressRootProps extends BaseUIComponentProps<'div', ProgressRoot.State> {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value of the meter.
   */
  'aria-valuetext'?: JSX.AriaAttributes['aria-valuetext'] | undefined;
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * Accepts a function which returns a string value that provides a human-readable text alternative for the current value of the progress bar.
   * @param {string} formattedValue The component's formatted value.
   * @param {number | null} value The component's numerical value.
   * @returns {string}
   */
  getAriaValueText?: ((formattedValue: string | null, value: number | null) => string) | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum value.
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum value.
   * @default 0
   */
  min?: number | undefined;
  /**
   * The current value. The component is indeterminate when value is `null`.
   * @default null
   */
  value: number | null;
}

export namespace ProgressRoot {
  export type State = ProgressRootState;
  export type Props = ProgressRootProps;
}
