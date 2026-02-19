import { Field } from '@msviderok/base-ui-solid/field';

function App() {
  let ref!: HTMLTextAreaElement;
  return <Field.Control ref={ref as any} render="textarea" />;
}
