import { createContext, useContext, type Accessor } from 'solid-js';

export type MeterRootContext = {
  formattedValue: Accessor<string>;
  max: Accessor<number>;
  min: Accessor<number>;
  setLabelId: React.Dispatch<React.SetStateAction<string | undefined>>;
  value: Accessor<number>;
};

export const MeterRootContext = createContext<MeterRootContext>();

export function useMeterRootContext() {
  const context = useContext(MeterRootContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.',
    );
  }

  return context;
}
