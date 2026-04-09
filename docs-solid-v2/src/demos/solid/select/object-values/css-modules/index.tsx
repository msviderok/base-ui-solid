import type { JSX } from 'solid-js';
import { Select } from '@msviderok/base-ui-solid/select';
import { Field } from '@msviderok/base-ui-solid/field';
import styles from './index.module.css';

export default function ObjectValueSelect() {
  return (
    <Field.Root class={styles.Field}>
      <Field.Label class={styles.Label} nativeLabel={false} render={<div />}>
        Shipping method
      </Field.Label>
      <Select.Root defaultValue={shippingMethods[0]} itemToStringValue={(item) => item.id}>
        <Select.Trigger class={styles.Select}>
          <Select.Value>
            {(method: ShippingMethod) => (
              <span class={styles.ValueText}>
                <span class={styles.ValuePrimary}>{method.name}</span>
                <span class={styles.ValueSecondary}>
                  {method.duration} ({method.price})
                </span>
              </span>
            )}
          </Select.Value>
          <Select.Icon class={styles.SelectIcon}>
            <ChevronUpDownIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner class={styles.Positioner} sideOffset={8}>
            <Select.Popup class={styles.Popup}>
              <Select.ScrollUpArrow class={styles.ScrollArrow} />
              <Select.List class={styles.List}>
                {shippingMethods.map((method) => (
                  <Select.Item key={method.id} value={method} class={styles.Item}>
                    <Select.ItemIndicator class={styles.ItemIndicator}>
                      <CheckIcon class={styles.ItemIndicatorIcon} />
                    </Select.ItemIndicator>
                    <Select.ItemText class={styles.ItemText}>
                      <span class={styles.ItemLabel}>{method.name}</span>
                      <span class={styles.ItemDescription}>
                        {method.duration} ({method.price})
                      </span>
                    </Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
              <Select.ScrollDownArrow class={styles.ScrollArrow} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </Field.Root>
  );
}

function ChevronUpDownIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      width="8"
      height="12"
      viewBox="0 0 8 12"
      fill="none"
      stroke="currentcolor"
      strokeWidth="1.5"
      {...props}
    >
      <path d="M0.5 4.5L4 1.5L7.5 4.5" />
      <path d="M0.5 7.5L4 10.5L7.5 7.5" />
    </svg>
  );
}

function CheckIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" {...props}>
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  );
}

interface ShippingMethod {
  id: string;
  name: string;
  duration: string;
  price: string;
}

const shippingMethods: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Standard',
    duration: 'Delivers in 4-6 business days',
    price: '$4.99',
  },
  {
    id: 'express',
    name: 'Express',
    duration: 'Delivers in 2-3 business days',
    price: '$9.99',
  },
  {
    id: 'overnight',
    name: 'Overnight',
    duration: 'Delivers next business day',
    price: '$19.99',
  },
];
