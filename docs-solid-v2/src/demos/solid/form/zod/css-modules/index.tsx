import { Field } from '@msviderok/base-ui-solid/field';
import { Form } from '@msviderok/base-ui-solid/form';
import { createSignal } from 'solid-js';
import { z } from 'zod';
import styles from './index.module.css';

const schema = z.object({
  name: z.string().min(1),
  age: z.coerce.number().positive(),
});

async function submitForm(event: SubmitEvent) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const result = schema.safeParse(Object.fromEntries(formData as any));

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  return {
    errors: {},
  };
}

export default function Page() {
  const [errors, setErrors] = createSignal({});

  return (
    <Form
      class={styles.Form}
      errors={errors()}
      onClearErrors={setErrors}
      onSubmit={async (event) => {
        const response = await submitForm(event);
        setErrors(response.errors);
      }}
    >
      <Field.Root name="name" class={styles.Field}>
        <Field.Label class={styles.Label}>Name</Field.Label>
        <Field.Control placeholder="Enter name" class={styles.Input} />
        <Field.Error class={styles.Error} />
      </Field.Root>
      <Field.Root name="age" class={styles.Field}>
        <Field.Label class={styles.Label}>Age</Field.Label>
        <Field.Control placeholder="Enter age" class={styles.Input} />
        <Field.Error class={styles.Error} />
      </Field.Root>
      <button type="submit" class={styles.Button}>
        Submit
      </button>
    </Form>
  );
}
