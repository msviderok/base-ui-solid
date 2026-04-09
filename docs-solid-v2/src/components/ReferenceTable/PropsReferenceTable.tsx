import { ReferenceAccordion } from './ReferenceAccordion';
import type { PropDef } from './types';

interface Props {
  data: Record<string, PropDef>;
  name: string;
  class?: string;
  renameFrom?: string;
  renameTo?: string;
}

export function PropsReferenceTable(props: Props) {
  return (
    <ReferenceAccordion
      class={props.class}
      name={props.name}
      data={props.data}
      renameFrom={props.renameFrom}
      renameTo={props.renameTo}
    />
  );
}
