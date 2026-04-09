import { Field } from '@msviderok/base-ui-solid/field';

export default function ExampleField() {
  return (
    <Field.Root class="flex w-full max-w-64 flex-col items-start gap-1">
      <Field.Label class="text-sm font-medium text-gray-900">Name</Field.Label>
      <Field.Control
        required
        placeholder="Required"
        class="h-10 w-full rounded-md border border-gray-200 pl-3.5 text-base text-gray-900 focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800"
      />
      <Field.Error class="text-sm text-red-800" match="valueMissing">
        Please enter your name
      </Field.Error>

      <Field.Description class="text-sm text-gray-600">Visible on your profile</Field.Description>
    </Field.Root>
  );
}
