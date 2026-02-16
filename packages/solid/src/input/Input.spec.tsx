import { Input } from '@msviderok/base-ui-solid/input';

function App() {
  let ref!: HTMLTextAreaElement;
  return <Input ref={ref as any} render="textarea" />;
}
