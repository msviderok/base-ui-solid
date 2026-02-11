import { expectType } from '#test-utils';
import { Dialog } from '@msviderok/base-ui-solid/dialog';

const numberPayloadHandle = Dialog.createHandle<number>();

const rootWithDirectChildren = (
  <Dialog.Root handle={numberPayloadHandle}>
    <Dialog.Portal />
  </Dialog.Root>
);

const rootWithFunctionChildren = (
  <Dialog.Root handle={numberPayloadHandle}>
    {(data) => {
      expectType<number | undefined, typeof data.payload>(data.payload);
      return null;
    }}
  </Dialog.Root>
);

const triggerWithPayload = <Dialog.Trigger handle={numberPayloadHandle} payload={42} />;
const triggerWithoutPayload = <Dialog.Trigger handle={numberPayloadHandle} />;

const triggerWithInvalidPayload = (
  // @ts-expect-error
  <Dialog.Trigger handle={numberPayloadHandle} payload={'invalid'} />
);
