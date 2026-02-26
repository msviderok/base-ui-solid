import { createContext, createSignal, useContext, type Accessor, type JSX } from 'solid-js';
import { CompositeList } from '../../src/composite/list/CompositeList';
import { useCompositeListItem } from '../../src/composite/list/useCompositeListItem';
import {
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
  useTypeahead,
} from '../../src/floating-ui-solid';

interface SelectContextValue {
  activeIndex: Accessor<number | null>;
  selectedIndex: Accessor<number | null>;
  getItemProps: ReturnType<typeof useInteractions>['getItemProps'];
  handleSelect: (index: number | null) => void;
}

const SelectContext = createContext<SelectContextValue>({} as SelectContextValue);

/** @internal */
function Listbox(props: { children: JSX.Element }) {
  const [activeIndex, setActiveIndex] = createSignal<number | null>(1);
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);

  const { refs, context } = useFloating({
    open: true,
  });

  const compositeListRefs = {
    elements: [] as Array<HTMLElement | null>,
    labels: [] as Array<string | null>,
  };

  const handleSelect = (index: number | null) => {
    setSelectedIndex(index);
  };

  function handleTypeaheadMatch(index: number | null) {
    setActiveIndex(index);
  }

  const listNav = useListNavigation({
    context,
    props: {
      get listRef() {
        return compositeListRefs.elements;
      },
      get activeIndex() {
        return activeIndex();
      },
      get selectedIndex() {
        return selectedIndex();
      },
      onNavigate: setActiveIndex,
      focusItemOnHover: false,
    },
  });
  const typeahead = useTypeahead({
    context,
    props: {
      get listRef() {
        return compositeListRefs.labels;
      },
      get activeIndex() {
        return activeIndex();
      },
      get selectedIndex() {
        return selectedIndex();
      },
      onMatch: handleTypeaheadMatch,
    },
  });
  const role = useRole({ context, props: { role: 'listbox' } });

  const { getFloatingProps, getItemProps } = useInteractions([listNav, typeahead, role]);

  const selectContext = {
    activeIndex,
    selectedIndex,
    getItemProps,
    handleSelect,
  };

  return (
    <SelectContext.Provider value={selectContext}>
      <button onClick={() => setSelectedIndex(1)} data-testid="reference" type="button">
        Select
      </button>
      <div ref={refs.setFloating} {...getFloatingProps()}>
        <CompositeList refs={compositeListRefs}>{props.children}</CompositeList>
      </div>
    </SelectContext.Provider>
  );
}

/** @internal */
function Option(props: { label: string }) {
  const { activeIndex, selectedIndex, getItemProps, handleSelect } = useContext(SelectContext);

  const { setRef, index } = useCompositeListItem({ label: () => props.label });

  const isActive = () => activeIndex() === index();
  const isSelected = () => selectedIndex() === index();

  const isFocusable = () =>
    // eslint-disable-next-line no-nested-ternary
    activeIndex() !== null ? isActive() : selectedIndex() !== null ? isSelected() : index() === 0;

  return (
    <button
      ref={setRef}
      type="button"
      role="option"
      aria-selected={isActive() && isSelected()}
      tabIndex={isFocusable() ? 0 : -1}
      style={{
        background: isActive() ? 'cyan' : '',
        'font-weight': isSelected() ? 'bold' : '',
      }}
      {...getItemProps({
        onClick: () => handleSelect(index()),
      })}
    >
      {props.label}
    </button>
  );
}

/** @internal */
export function Main() {
  return (
    <Listbox>
      <Option label="Apple" />
      <Option label="Blueberry" />
      <Option label="Watermelon" />
      <Option label="Banana" />
    </Listbox>
  );
}
