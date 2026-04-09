import { Field } from '@msviderok/base-ui-solid/field';
import { Fieldset } from '@msviderok/base-ui-solid/fieldset';

export default function ExampleField() {
  return (
    <Fieldset.Root class="flex w-full max-w-64 flex-col gap-4">
      <Fieldset.Legend class="border-b border-gray-200 pb-3 text-lg font-medium text-gray-900">
        Billing details
      </Fieldset.Legend>

      <Field.Root class="flex flex-col items-start gap-1">
        <Field.Label class="text-sm font-medium text-gray-900">Company</Field.Label>
        <Field.Control
          placeholder="Enter company name"
          class="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
        />
      </Field.Root>

      <Field.Root class="flex flex-col items-start gap-1">
        <Field.Label class="text-sm font-medium text-gray-900">Tax ID</Field.Label>
        <Field.Control
          placeholder="Enter fiscal number"
          class="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
        />
      </Field.Root>
    </Fieldset.Root>
  );
}
