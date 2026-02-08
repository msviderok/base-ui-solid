import { createMemo, createSignal, type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { formatNumber } from '../../utils/formatNumber';
import { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { MeterRootContext } from './MeterRootContext';

function formatValue(
  value: number,
  locale?: Intl.LocalesArgument,
  format?: Intl.NumberFormatOptions,
): string {
  if (!format) {
    return formatNumber(value / 100, locale, { style: 'percent' });
  }

  return formatNumber(value, locale, format);
}

/**
 * Groups all parts of the meter and provides the value for screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterRoot(componentProps: MeterRoot.Props) {
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
  const valueProp = () => local.value;

  const [labelId, setLabelId] = createSignal<string>();
  const formattedValue = () => formatValue(valueProp(), local.locale, local.format);

  const ariaValuetext = createMemo(() => {
    if (local.getAriaValueText) {
      return local.getAriaValueText(formattedValue(), valueProp());
    }

    if (local.format) {
      return formattedValue();
    }

    return `${valueProp()}%`;
  });

  const defaultProps: HTMLProps = {
    role: 'meter',
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
      return valueProp();
    },
    get 'aria-valuetext'() {
      return ariaValuetext();
    },
  };

  const contextValue: MeterRootContext = {
    formattedValue,
    max,
    min,
    setLabelId,
    value: valueProp,
  };

  const element = useRenderElement('div', componentProps, {
    props: [defaultProps, elementProps],
  });

  return <MeterRootContext.Provider value={contextValue}>{element()}</MeterRootContext.Provider>;
}

export interface MeterRootState {}

export interface MeterRootProps extends BaseUIComponentProps<'div', MeterRoot.State> {
  /**
   * A string value that provides a user-friendly name for `aria-valuenow`, the current value of the meter.
   */
  'aria-valuetext'?: JSX.AriaAttributes['aria-valuetext'];
  /**
   * Options to format the value.
   */
  format?: Intl.NumberFormatOptions;
  /**
   * A function that returns a string value that provides a human-readable text alternative for `aria-valuenow`, the current value of the meter.
   * @param {string} formattedValue The formatted value
   * @param {number} value The raw value
   * @returns {string}
   */
  getAriaValueText?: (formattedValue: string, value: number) => string;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument;
  /**
   * The maximum value
   * @default 100
   */
  max?: number;
  /**
   * The minimum value
   * @default 0
   */
  min?: number;
  /**
   * The current value.
   */
  value: number;
}

export namespace MeterRoot {
  export type State = MeterRootState;
  export type Props = MeterRootProps;
}
