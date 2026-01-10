import {
  buildQueries,
  render,
  type BoundFunction,
  type queries,
  type Queries,
} from '@solidjs/testing-library';
import type { userEvent } from '@testing-library/user-event';
import { type Component, type JSX, type Ref, type ValidComponent } from 'solid-js';
import type { DynamicProps } from 'solid-js/web';
import type { ComponentRenderFn } from '../src/utils/types';
import { testClassName } from './conformanceTests/className';
import { testPropForwarding } from './conformanceTests/propForwarding';
import { testRefForwarding } from './conformanceTests/refForwarding';
import { testRenderProp } from './conformanceTests/renderProp';
import createDescribe from './createDescribe';

type RenderResult<Q extends Queries = typeof queries> = ReturnType<typeof render> & {
  [P in keyof Q]: BoundFunction<Q[P]>;
};

function queryAllDescriptionsOf(baseElement: HTMLElement, element: Element): HTMLElement[] {
  const ariaDescribedBy = element.getAttribute('aria-describedby');
  if (ariaDescribedBy === null) {
    return [];
  }
  return ariaDescribedBy
    .split(' ')
    .map((id) => {
      return document.getElementById(id);
    })
    .filter((maybeElement): maybeElement is HTMLElement => {
      return maybeElement !== null && baseElement.contains(maybeElement);
    });
}

const [
  queryDescriptionOf,
  getAllDescriptionsOf,
  getDescriptionOf,
  findAllDescriptionsOf,
  findDescriptionOf,
] = buildQueries<[Element]>(
  queryAllDescriptionsOf,
  function getMultipleError() {
    return `Found multiple descriptions.`;
  },
  function getMissingError() {
    return `Found no describing element.`;
  },
);

export const customQueries = {
  queryDescriptionOf,
  queryAllDescriptionsOf,
  getDescriptionOf,
  getAllDescriptionsOf,
  findDescriptionOf,
  findAllDescriptionsOf,
};

interface DataProps {
  [key: `data-${string}`]: string;
}

export interface SlotTestingOptions {
  /**
   * A custom Solid component to test if the receiving props are correct.
   *
   * It must:
   * - contains at least one DOM which has `data-testid="custom"`
   * - spread `class` to the DOM
   *
   * If not provided, the default custom component tests if the class name is spread.
   */
  testWithComponent?: Component;
  /**
   * A custom HTML tag to use for the `slots` prop.
   */
  testWithElement?: keyof JSX.IntrinsicElements | null;
  /**
   * To ensure that the slot has this class name when `slotProps` is provided.
   */
  expectedClassName: string;
  isOptional?: boolean;
}

interface SlotTestOverride {
  slotName: string;
  slotClass?: string;
}

export interface MuiRenderResult extends RenderResult<typeof queries & typeof customQueries> {
  user: ReturnType<typeof userEvent.setup>;
}

export interface ConformanceOptions {
  muiName: string;
  classes: { root: string };
  refInstanceof: any;
  after?: () => void;
  inheritComponent?: ValidComponent;
  render: (node: Component<DataProps>) => MuiRenderResult | Promise<MuiRenderResult>;
  only?: Array<keyof typeof fullSuite>;
  skip?: Array<keyof typeof fullSuite | 'classesRoot'>;
  testComponentsRootPropWith?: string;
  /**
   * A custom Solid component to test if the component prop is implemented correctly.
   *
   * It must either:
   * - Be a string that is a valid HTML tag, or
   * - A component that spread props to the underlying rendered element.
   *
   * If not provided, the default 'em' element is used.
   */
  testComponentPropWith?: string | Component;
  testDeepOverrides?: SlotTestOverride | SlotTestOverride[];
  testRootOverrides?: SlotTestOverride;
  testStateOverrides?: { prop?: string; value?: any; styleKey: string };
  testCustomVariant?: boolean;
  testVariantProps?: object;
  testLegacyComponentsProp?: boolean | string[];
  slots?: Record<string, SlotTestingOptions>;
  ThemeProvider?: Component;
  /**
   * If provided, the component will be tested by the `DefaultPropsProvider` (in addition to the ThemeProvider).
   */
  DefaultPropsProvider?: Component;
  createTheme?: (arg: any) => any;
}

export type ConformantComponentProps = {
  render?:
    | keyof JSX.IntrinsicElements
    | DynamicProps<any>
    | ComponentRenderFn<Record<string, unknown>, any>
    | null;
  ref?: Ref<any>;
  'data-testid'?: string;
  class?: string | ((state: unknown) => string);
  style?: JSX.CSSProperties;
  nativeButton?: boolean;
};

export type RenderOptions = Parameters<typeof render>[1];

export interface BaseUiConformanceTestsOptions<
  Props extends Record<string, any> = ConformantComponentProps,
> extends Omit<Partial<ConformanceOptions>, 'render' | 'mount' | 'skip' | 'classes'> {
  render: (
    element: (props: Props) => JSX.Element,
    elementProps?: Props,
    options?: RenderOptions | undefined,
  ) => MuiRenderResult;
  skip?: (keyof typeof fullSuite)[];
  testRenderPropWith?: keyof JSX.IntrinsicElements;
  button?: boolean;
}

const fullSuite = {
  propsSpread: testPropForwarding,
  refForwarding: testRefForwarding,
  renderProp: testRenderProp,
  className: testClassName,
};

function describeConformanceFn(
  minimalElement: Component<any>,
  getOptions: () => BaseUiConformanceTestsOptions,
) {
  const { after: runAfterHook = () => {}, only = Object.keys(fullSuite), skip = [] } = getOptions();

  const filteredTests = Object.keys(fullSuite).filter(
    (testKey) =>
      only.indexOf(testKey) !== -1 && skip.indexOf(testKey as keyof typeof fullSuite) === -1,
  ) as (keyof typeof fullSuite)[];

  afterAll(runAfterHook);

  filteredTests.forEach((testKey) => {
    const test = fullSuite[testKey];
    test(minimalElement, () => ({
      ...getOptions(),
      render: (props, ...args) => getOptions().render(props ?? {}, ...args),
    }));
  });
}

export const describeConformance = createDescribe('Base UI component API', describeConformanceFn);
