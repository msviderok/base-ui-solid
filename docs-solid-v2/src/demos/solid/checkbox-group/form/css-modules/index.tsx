import { Checkbox } from '@msviderok/base-ui-solid/checkbox';
import { CheckboxGroup } from '@msviderok/base-ui-solid/checkbox-group';
import { Field } from '@msviderok/base-ui-solid/field';
import { Fieldset } from '@msviderok/base-ui-solid/fieldset';
import { Form } from '@msviderok/base-ui-solid/form';
import { createSignal } from 'solid-js';
import type { JSX } from 'solid-js';
import styles from './index.module.css';

export default function ExampleCheckboxGroup() {
  const [loading, setLoading] = createSignal(false);
  return (
    <Form
      class={styles.Form}
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setLoading(true);
        await submitForm(formData);
        setLoading(false);
      }}
    >
      <Field.Root name="toppings" render={Fieldset.Root} class={styles.Fieldset}>
        <Fieldset.Legend class={styles.Legend}>Extra toppings</Fieldset.Legend>
        <CheckboxGroup defaultValue={[]} disabled={loading()} class={styles.CheckboxGroup}>
          <Field.Label class={styles.Item}>
            <Checkbox.Root value="anchovies" class={styles.Checkbox}>
              <Checkbox.Indicator class={styles.Indicator}>
                <CheckIcon class={styles.Icon} />
              </Checkbox.Indicator>
            </Checkbox.Root>
            Anchovies
          </Field.Label>

          <Field.Label class={styles.Item}>
            <Checkbox.Root value="olives" class={styles.Checkbox}>
              <Checkbox.Indicator class={styles.Indicator}>
                <CheckIcon class={styles.Icon} />
              </Checkbox.Indicator>
            </Checkbox.Root>
            Olives
          </Field.Label>

          <Field.Label class={styles.Item}>
            <Checkbox.Root value="jalapenos" class={styles.Checkbox}>
              <Checkbox.Indicator class={styles.Indicator}>
                <CheckIcon class={styles.Icon} />
              </Checkbox.Indicator>
            </Checkbox.Root>
            Jalapeños
          </Field.Label>
        </CheckboxGroup>
      </Field.Root>
      <button type="submit" disabled={loading()} class={styles.Button}>
        Add
      </button>
    </Form>
  );
}

async function submitForm(formData: FormData) {
  // Mimic a server response
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  try {
    const toppings = formData.getAll('toppings');
    // => ['anchovies', 'olives']
    return {
      success: true,
      data: {
        toppings,
      },
    };
  } catch {
    return { errors: { toppings: 'Server error' } };
  }
}

function CheckIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" {...props}>
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  );
}
