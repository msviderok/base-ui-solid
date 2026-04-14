import type { DemoFile } from '../Demo';
import LZString from 'lz-string';
import { addHiddenInput } from './addHiddenInput';
import * as CSA from './CreateSolidApp';
import { packDemo } from './packDemo';

export function createCodeSandbox(options: createCodeSandbox.Options) {
  const payload = createCodeSandboxRequestPayload(options);
  const initialFile = Object.keys(payload)[0];
  const parameters = compress({ files: payload });

  // ref: https://codesandbox.io/docs/learn/sandboxes/cli-api#define-api
  const form = document.createElement('form');
  form.method = 'POST';
  form.target = '_blank';
  form.action = 'https://codesandbox.io/api/v1/sandboxes/define';
  addHiddenInput(form, 'parameters', parameters);
  addHiddenInput(form, 'query', `file=${initialFile}`);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

export namespace createCodeSandbox {
  export interface Options {
    /**
     * The title of the sandbox.
     */
    title: string;
    /**
     * The natural language of the sandbox (to be placed in the `html` lang attribute).
     */
    naturalLanguage?: string;
    /**
     * The description of the sandbox.
     */
    description?: string;
    /**
     * The demo files to be included in the sandbox.
     */
    demoFiles: DemoFile[];
    /**
     * The language of the entry point file.
     */
    demoLanguage: 'js' | 'ts';
    /**
     * The dependencies to be included in the sandbox.
     * They are added on top of dependencies found in the demo files.
     */
    dependencies: Record<string, string>;
    /**
     * The dev dependencies to be included in the sandbox.
     */
    devDependencies?: Record<string, string>;
    /**
     * A function to resolve dependencies versions.
     * By default, it resolves to the `latest` version.
     */
    dependencyResolver?: (importPath: string) => Record<string, string>;
    /**
     * Additional content to be placed in the `head` tag of the `index.html` file.
     */
    additionalHtmlHeadContent?: string;
    /**
     * The custom index (JS/TS) file content.
     */
    customIndexFile?: string;
    /**
     * A function to customize the files to be included in the sandbox.
     * It is called for each of the demo files with its name and content.
     * It expects a tuple with the new file name and content or `null` to apply standard rules
     * (place the file in the `src` directory).
     */
    onAddingFile?: (fileName: string, content: string) => [string, string] | null;
  }
}

function createCodeSandboxRequestPayload(options: createCodeSandbox.Options) {
  const {
    title,
    naturalLanguage = 'en',
    customIndexFile,
    demoFiles,
    demoLanguage,
    additionalHtmlHeadContent,
    onAddingFile,
  } = options;

  const packagedDemo = packDemo(demoFiles);
  const indexExtension = demoLanguage === 'ts' ? '.tsx' : '.js';

  const demoFilesToInclude = transformDemoFiles(packagedDemo.processedFiles, onAddingFile);

  const files: Record<string, { content: string | object }> = {
    ...demoFilesToInclude,
    [`src/index${indexExtension}`]: {
      content: customIndexFile ?? CSA.getRootIndex(demoLanguage === 'ts'),
    },
    'public/index.html': {
      content: CSA.getHtml({
        title,
        language: naturalLanguage,
        additionalHeadContent: additionalHtmlHeadContent,
      }),
    },
    'package.json': {
      content: createPackageJson(
        options,
        packagedDemo.externalImports,
        `src/index${indexExtension}`,
      ),
    },
    'vite.config.ts': {
      content: CSA.getViteConfig(),
    },
  };

  if (demoLanguage === 'ts') {
    files['tsconfig.json'] = {
      content: CSA.getTsconfig(),
    };
    files['tsconfig.node.json'] = {
      content: CSA.getTsconfigNode(),
    };
  }

  return files;
}

function defaultDependencyResolver(importPath: string) {
  return {
    [importPath]: 'latest',
  };
}

function createPackageJson(
  options: createCodeSandbox.Options,
  sourceDependencies: string[],
  mainFile: string,
) {
  const {
    dependencies: hardcodedDependencies,
    description,
    devDependencies,
    dependencyResolver = defaultDependencyResolver,
  } = options;
  const dependencies = new Map<string, string>();

  sourceDependencies.forEach((dependency) => {
    const resolvedDependencies = dependencyResolver(dependency);
    Object.entries(resolvedDependencies).forEach(([name, version]) => {
      dependencies.set(name, version);
    });
  });

  Object.entries(hardcodedDependencies).forEach(([name, version]) => {
    dependencies.set(name, version);
  });

  return {
    description,
    dependencies: Object.fromEntries(dependencies),
    devDependencies,
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    main: mainFile,
  };
}

function transformDemoFiles(
  files: Record<string, string>,
  onAddingFile: ((fileName: string, content: string) => [string, string] | null) | undefined,
) {
  const processedFiles: Record<string, { content: string }> = {};
  Object.keys(files).forEach((file) => {
    const customProcessed = onAddingFile?.(file, files[file]);
    if (customProcessed) {
      processedFiles[customProcessed[0]] = { content: customProcessed[1] };
    } else {
      processedFiles[`src/${file}`] = { content: files[file] };
    }
  });

  return processedFiles;
}

function compress(object: any) {
  return LZString.compressToBase64(JSON.stringify(object))
    .replace(/\+/g, '-') // Convert '+' to '-'
    .replace(/\//g, '_') // Convert '/' to '_'
    .replace(/=+$/, ''); // Remove ending '='
}
