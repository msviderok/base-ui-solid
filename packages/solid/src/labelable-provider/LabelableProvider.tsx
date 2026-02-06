'use client';
import { createSignal, type JSX } from 'solid-js';
import { mergeProps } from '../merge-props';
import { HTMLProps } from '../utils/types';
import { useBaseUiId } from '../utils/useBaseUiId';
import { LabelableContext, useLabelableContext } from './LabelableContext';

/**
 * @internal
 */
export function LabelableProvider(props: LabelableProvider.Props) {
  const defaultId = useBaseUiId();

  const [controlId, setControlId] = createSignal<string | null | undefined>(
    props.initialControlId === undefined ? defaultId() : props.initialControlId,
  );
  const [labelId, setLabelId] = createSignal<string | undefined>(undefined);
  const [messageIds, setMessageIds] = createSignal<string[]>([]);

  const { messageIds: parentMessageIds } = useLabelableContext();

  const getDescriptionProps = (externalProps: HTMLProps) => {
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
    setControlId,
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
