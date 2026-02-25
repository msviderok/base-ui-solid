import { createSignal, type JSX } from 'solid-js';
import { mergeProps } from '../merge-props';
import { HTMLProps, type BaseUIHTMLProps } from '../utils/types';
import { useBaseUiId } from '../utils/useBaseUiId';
import { LabelableContext, useLabelableContext } from './LabelableContext';

/**
 * @internal
 */
export function LabelableProvider(props: LabelableProvider.Props) {
  const defaultId = useBaseUiId();

  const [controlId, setControlIdState] = createSignal<string | null | undefined>(
    props.initialControlId === undefined ? defaultId() : props.initialControlId,
  );
  const [labelId, setLabelId] = createSignal<string | undefined>(undefined);
  const [messageIds, setMessageIds] = createSignal<string[]>([]);

  const registrationsRef = new Map<symbol, string | null>();

  const { messageIds: parentMessageIds } = useLabelableContext();

  const registerControlId = (source: symbol, nextId: string | null | undefined) => {
    const registrations = registrationsRef;

    if (nextId === undefined) {
      registrations.delete(source);
      return;
    }

    registrations.set(source, nextId);

    // Only flush when registering, not when unregistering.
    // This prevents loops during rapid unmount/remount cycles (e.g. React Activity).
    // The next registration will pick up the correct state.
    setControlIdState((prev) => {
      if (registrations.size === 0) {
        return undefined;
      }

      let nextControlId: string | null | undefined;

      for (const id of registrations.values()) {
        if (prev !== undefined && id === prev) {
          return prev;
        }

        if (nextControlId === undefined) {
          nextControlId = id;
        }
      }

      return nextControlId;
    });
  };

  const getDescriptionProps = (externalProps: HTMLProps | BaseUIHTMLProps) => {
    return mergeProps(
      {
        get 'aria-describedby'() {
          return parentMessageIds().concat(messageIds()).join(' ') || undefined;
        },
      },
      externalProps,
    );
  };

  const contextValue: LabelableContext = {
    controlId,
    registerControlId,
    labelId,
    setLabelId,
    messageIds,
    setMessageIds,
    getDescriptionProps,
  };

  return (
    <LabelableContext.Provider value={contextValue}>{props.children}</LabelableContext.Provider>
  );
}

export interface LabelableProviderProps {
  initialControlId?: string | null | undefined;
  children?: JSX.Element;
}

export namespace LabelableProvider {
  export type Props = LabelableProviderProps;
}
