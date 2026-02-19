import { batch, createSignal, type Accessor } from 'solid-js';
import type { BaseUIChangeEventDetails } from '../utils/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../utils/reasons';
import { useBaseUiId } from '../utils/useBaseUiId';

const EMPTY: string[] = [];

export function useCheckboxGroupParent(
  params: useCheckboxGroupParent.Parameters,
): useCheckboxGroupParent.ReturnValue {
  const allValues = () => params.allValues?.() ?? EMPTY;
  const value = () => params.value?.() ?? EMPTY;

  let uncontrolledStateRef = value();
  const disabledStatesRef = new Map<string, boolean>();

  const [status, setStatus] = createSignal<'on' | 'off' | 'mixed'>('mixed');

  const id = useBaseUiId();
  const checked = () => value().length === allValues().length;
  const indeterminate = () => value().length !== allValues().length && value().length > 0;

  const getParentProps: useCheckboxGroupParent.ReturnValue['getParentProps'] = () => ({
    get id() {
      return id();
    },
    get indeterminate() {
      return indeterminate();
    },
    get checked() {
      return checked();
    },
    // TODO: custom `id` on child checkboxes breaks this
    // https://github.com/mui/base-ui/issues/2691
    get 'aria-controls'() {
      return allValues()
        .map((v) => `${id()}-${v}`)
        .join(' ');
    },
    onCheckedChange(_, eventDetails) {
      batch(() => {
        const uncontrolledState = uncontrolledStateRef;

        // None except the disabled ones that are checked, which can't be changed.
        const none = allValues().filter(
          (v) => disabledStatesRef.get(v) && uncontrolledState.includes(v),
        );
        // "All" that are valid:
        // - any that aren't disabled
        // - disabled ones that are checked
        const all = allValues().filter(
          (v) =>
            !disabledStatesRef.get(v) ||
            (disabledStatesRef.get(v) && uncontrolledState.includes(v)),
        );

        const allOnOrOff =
          uncontrolledState.length === all.length || uncontrolledState.length === 0;

        if (allOnOrOff) {
          if (value().length === all.length) {
            params.onValueChange?.(none, eventDetails);
          } else {
            params.onValueChange?.(all, eventDetails);
          }
          return;
        }

        if (status() === 'mixed') {
          params.onValueChange?.(all, eventDetails);
          setStatus('on');
        } else if (status() === 'on') {
          params.onValueChange?.(none, eventDetails);
          setStatus('off');
        } else if (status() === 'off') {
          params.onValueChange?.(uncontrolledState, eventDetails);
          setStatus('mixed');
        }
      });
    },
  });

  const getChildProps: useCheckboxGroupParent.ReturnValue['getChildProps'] = (
    childValue: string,
  ) => ({
    get checked() {
      return value().includes(childValue);
    },
    onCheckedChange(nextChecked, eventDetails) {
      batch(() => {
        const newValue = value().slice();
        if (nextChecked) {
          newValue.push(childValue);
        } else {
          newValue.splice(newValue.indexOf(childValue), 1);
        }
        uncontrolledStateRef = newValue;
        params.onValueChange?.(newValue, eventDetails);
        setStatus('mixed');
      });
    },
  });

  return {
    id,
    indeterminate,
    getParentProps,
    getChildProps,
    disabledStatesRef,
  };
}

export interface UseCheckboxGroupParentParameters {
  allValues?: Accessor<string[] | undefined>;
  value?: Accessor<string[] | undefined>;
  onValueChange?:
    | ((
        value: string[],
        eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
      ) => void)
    | undefined;
}

export interface UseCheckboxGroupParentReturnValue {
  id: Accessor<string | undefined>;
  indeterminate: Accessor<boolean>;
  disabledStatesRef: Map<string, boolean>;
  getParentProps: () => {
    id: string | undefined;
    indeterminate: boolean;
    checked: boolean;
    'aria-controls': string;
    onCheckedChange: (
      checked: boolean,
      eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
    ) => void;
  };
  getChildProps: (name: string) => {
    checked: boolean;
    onCheckedChange: (
      checked: boolean,
      eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
    ) => void;
  };
}

export namespace useCheckboxGroupParent {
  export type Parameters = UseCheckboxGroupParentParameters;
  export type ReturnValue = UseCheckboxGroupParentReturnValue;
}
