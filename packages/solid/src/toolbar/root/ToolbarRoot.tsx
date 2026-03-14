import { createMemo, createSignal, type Accessor } from 'solid-js';
import type { CompositeMetadata } from '../../composite/list/CompositeList';
import { CompositeRoot } from '../../composite/root/CompositeRoot';
import { splitComponentProps } from '../../solid-helpers';
import { Orientation as BaseOrientation, BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { ToolbarRootContext } from './ToolbarRootContext';

/**
 * A container for grouping a set of controls, such as buttons, toggle groups, or menus.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarRoot(componentProps: ToolbarRoot.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'loopFocus',
    'orientation',
    'children',
  ]);
  const disabled = () => local.disabled ?? false;
  const loopFocus = () => local.loopFocus ?? true;
  const orientation = () => local.orientation ?? 'horizontal';

  const [itemArray, setItemArray] = createSignal<
    Array<{ element: Element; metadata: CompositeMetadata<ToolbarRoot.ItemMetadata> | null }>
  >([]);

  const disabledIndices = createMemo(() => {
    const output: number[] = [];
    console.log(itemArray());
    for (const { metadata } of itemArray()) {
      const idx = metadata?.index;
      if (idx && !metadata?.focusableWhenDisabled()) {
        output.push(idx);
      }
    }
    return output;
  });

  const toolbarRootContext: ToolbarRootContext = {
    disabled,
    orientation,
    setItemArray,
  };

  const state: ToolbarRoot.State = {
    get disabled() {
      return disabled();
    },
    get orientation() {
      return orientation();
    },
  };

  const defaultProps: Omit<HTMLProps, 'children'> = {
    get 'aria-orientation'() {
      return orientation();
    },
    role: 'toolbar',
  };

  return (
    <ToolbarRootContext.Provider value={toolbarRootContext}>
      <CompositeRoot
        render={renderProps.render}
        class={renderProps.class}
        state={state}
        ref={componentProps.ref}
        props={[defaultProps, elementProps]}
        disabledIndices={disabledIndices()}
        loopFocus={loopFocus()}
        onMapChange={setItemArray}
        orientation={orientation()}
      >
        {local.children}
      </CompositeRoot>
    </ToolbarRootContext.Provider>
  );
}

export interface ToolbarRootItemMetadata {
  focusableWhenDisabled: Accessor<boolean>;
}

export type ToolbarRootOrientation = BaseOrientation;

export interface ToolbarRootState {
  disabled: boolean;
  orientation: ToolbarRoot.Orientation;
}

export interface ToolbarRootProps extends BaseUIComponentProps<'div', ToolbarRoot.State> {
  disabled?: boolean | undefined;
  /**
   * The orientation of the toolbar.
   * @default 'horizontal'
   */
  orientation?: ToolbarRoot.Orientation | undefined;
  /**
   * If `true`, using keyboard navigation will wrap focus to the other end of the toolbar once the end is reached.
   *
   * @default true
   */
  loopFocus?: boolean | undefined;
}

export namespace ToolbarRoot {
  export type ItemMetadata = ToolbarRootItemMetadata;
  export type Orientation = ToolbarRootOrientation;
  export type State = ToolbarRootState;
  export type Props = ToolbarRootProps;
}
