import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as recast from 'recast';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import babelTsParser from 'recast/parsers/babel-ts.js';

const traverse = traverseModule.default ?? traverseModule;

const manualDemos = new Set([
  'autocomplete/virtualized',
  'combobox/virtualized',
  'drawer/mobile-nav',
]);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsSolidV2Dir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(docsSolidV2Dir, '..');
const reactRoot = path.join(repoRoot, 'docs');
const legacySolidRoot = path.join(repoRoot, 'docs-solid');
const targetRoot = path.join(docsSolidV2Dir, 'src', 'demos', 'solid');
const targetIconsDir = path.join(docsSolidV2Dir, 'src', 'icons');

function walkFiles(rootDir) {
  const files = [];

  function visit(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    visit(rootDir);
  }

  return files;
}

function shouldSkipReactFile(filePath) {
  return filePath.endsWith('/index.ts') || filePath.includes('/demos/') && manualDemos.has(demoKeyFromPath(filePath));
}

function demoKeyFromPath(filePath) {
  const demosDir = path.join(reactRoot, 'src', 'app', '(docs)', 'react', 'components');
  const relative = path.relative(demosDir, filePath).split(path.sep);
  const demoIndex = relative.indexOf('demos');
  if (demoIndex === -1 || relative.length < demoIndex + 3) {
    return '';
  }
  return `${relative[0]}/${relative[demoIndex + 1]}`;
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function relativeIconImport(fromFile) {
  const relative = path.relative(path.dirname(fromFile), targetIconsDir).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function importSourceReplacement(source, fromFile) {
  if (source.startsWith('@base-ui/react/')) {
    return source.replace('@base-ui/react/', '@msviderok/base-ui-solid/');
  }

  if (source.startsWith('docs/src/icons/')) {
    return `${relativeIconImport(fromFile)}/${source.slice('docs/src/icons/'.length)}`;
  }

  return source;
}

function normalizeReactTypes(code) {
  return code
    .replaceAll('React.ReactNode', 'any')
    .replaceAll(/React\.KeyboardEvent<[^>]+>/g, 'KeyboardEvent')
    .replaceAll(/React\.FormEvent<[^>]+>/g, 'SubmitEvent')
    .replaceAll(/React\.ComponentProps<\s*'([^']+)'\s*>/g, "ComponentProps<'$1'>")
    .replaceAll(/React\.CSSProperties/g, 'Record<string, string | number>')
    .replaceAll(/\s+as React\.CSSProperties/g, '')
    .replaceAll(/<React\.Fragment>/g, '<>')
    .replaceAll(/<\/React\.Fragment>/g, '</>');
}

function transformReactFile(source, fromFile, toFile) {
  if (source.includes('@tanstack/react-virtual') || source.includes('useImperativeHandle(')) {
    return null;
  }

  const ast = recast.parse(source, { parser: babelTsParser });
  const accessorNames = new Set();
  const refNames = new Set();
  let needsCreateEffect = false;
  let needsOnCleanup = false;
  let needsCreateSignal = false;
  let needsCreateMemo = false;
  let needsCreateUniqueId = false;
  let needsUseTransition = false;
  const needsComponentProps = source.includes('React.ComponentProps');

  traverse(ast, {
    Program(programPath) {
      programPath.node.directives = programPath.node.directives.filter(
        (directive) => directive.value.value !== 'use client',
      );
    },
    ImportDeclaration(importPath) {
      const source = importPath.node.source.value;

      if (source === 'react' || source === 'react-dom') {
        importPath.remove();
        return;
      }

      if (typeof source === 'string') {
        importPath.node.source.value = importSourceReplacement(source, fromFile);
      }
    },
    JSXAttribute(attributePath) {
      if (attributePath.node.name.type === 'JSXIdentifier' && attributePath.node.name.name === 'className') {
        attributePath.node.name.name = 'class';
      }
    },
    VariableDeclarator(varPath) {
      const { node } = varPath;
      if (!t.isCallExpression(node.init)) {
        return;
      }

      const callee = node.init.callee;
      const calleeName =
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object, { name: 'React' }) &&
        t.isIdentifier(callee.property)
          ? `React.${callee.property.name}`
          : t.isIdentifier(callee)
            ? callee.name
            : '';

      if (calleeName === 'React.useState' || calleeName === 'useState') {
        needsCreateSignal = true;
        if (t.isArrayPattern(node.id) && t.isIdentifier(node.id.elements[0])) {
          accessorNames.add(node.id.elements[0].name);
        }
        const nextCall = t.callExpression(t.identifier('createSignal'), node.init.arguments);
        if (node.init.typeParameters) {
          nextCall.typeParameters = node.init.typeParameters;
        }
        node.init = nextCall;
        return;
      }

      if (calleeName === 'React.useMemo' || calleeName === 'useMemo') {
        needsCreateMemo = true;
        if (t.isIdentifier(node.id)) {
          accessorNames.add(node.id.name);
        }
        const nextCall = t.callExpression(t.identifier('createMemo'), [
          t.arrowFunctionExpression([], t.isExpression(node.init.arguments[0]) ? node.init.arguments[0] : t.nullLiteral()),
        ]);
        if (node.init.typeParameters) {
          nextCall.typeParameters = node.init.typeParameters;
        }
        node.init = nextCall;
        return;
      }

      if (calleeName === 'React.useId' || calleeName === 'useId') {
        needsCreateUniqueId = true;
        node.init = t.callExpression(t.identifier('createUniqueId'), []);
        return;
      }

      if (calleeName === 'React.useCallback' || calleeName === 'useCallback') {
        node.init = node.init.arguments[0] ?? t.identifier('undefined');
        return;
      }

      if (calleeName === 'React.useTransition' || calleeName === 'useTransition') {
        needsUseTransition = true;
        if (t.isArrayPattern(node.id) && t.isIdentifier(node.id.elements[0])) {
          accessorNames.add(node.id.elements[0].name);
        }
        node.init = t.callExpression(t.identifier('useTransition'), []);
        return;
      }

      if (calleeName === 'React.useRef' || calleeName === 'useRef') {
        if (t.isIdentifier(node.id)) {
          refNames.add(node.id.name);
        }
        if (t.isVariableDeclaration(varPath.parent)) {
          varPath.parent.kind = 'let';
        }
        if (t.isIdentifier(node.id) && node.init.typeParameters?.params?.[0]) {
          node.id.typeAnnotation = t.tsTypeAnnotation(node.init.typeParameters.params[0]);
        }
        node.init = node.init.arguments[0] ?? t.nullLiteral();
        return;
      }
    },
    CallExpression(callPath) {
      const { node } = callPath;
      const callee = node.callee;
      const calleeName =
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object, { name: 'React' }) &&
        t.isIdentifier(callee.property)
          ? `React.${callee.property.name}`
          : t.isIdentifier(callee)
            ? callee.name
            : '';

      if (calleeName === 'React.useEffect' || calleeName === 'useEffect') {
        needsCreateEffect = true;
        const callback = node.arguments[0];
        if (!t.isFunction(callback)) {
          return;
        }

        const bodyStatements = t.isBlockStatement(callback.body)
          ? [...callback.body.body]
          : [t.returnStatement(callback.body)];

        const cleanupIndex = bodyStatements.findIndex((statement) =>
          t.isReturnStatement(statement) &&
          t.isFunctionExpression(statement.argument) || t.isArrowFunctionExpression(statement.argument),
        );

        if (cleanupIndex !== -1) {
          const cleanupStatement = bodyStatements.splice(cleanupIndex, 1)[0];
          if (
            t.isReturnStatement(cleanupStatement) &&
            cleanupStatement.argument &&
            (t.isArrowFunctionExpression(cleanupStatement.argument) || t.isFunctionExpression(cleanupStatement.argument))
          ) {
            needsOnCleanup = true;
            bodyStatements.push(
              t.expressionStatement(
                t.callExpression(t.identifier('onCleanup'), [
                  t.arrowFunctionExpression([], t.isBlockStatement(cleanupStatement.argument.body)
                    ? cleanupStatement.argument.body
                    : t.blockStatement([t.returnStatement(cleanupStatement.argument.body)])),
                ]),
              ),
            );
          }
        }

        callPath.replaceWith(
          t.callExpression(t.identifier('createEffect'), [
            t.arrowFunctionExpression([], t.blockStatement(bodyStatements)),
          ]),
        );
      }
    },
    MemberExpression(memberPath) {
      const { node } = memberPath;
      if (
        t.isIdentifier(node.property, { name: 'current' }) &&
        t.isIdentifier(node.object) &&
        refNames.has(node.object.name)
      ) {
        memberPath.replaceWith(t.identifier(node.object.name));
      }
    },
    Identifier(identifierPath) {
      const { node, parentPath } = identifierPath;
      if (!accessorNames.has(node.name) || !identifierPath.isReferencedIdentifier()) {
        return;
      }

      if (parentPath.isCallExpression() && parentPath.node.callee === node) {
        return;
      }

      if (
        parentPath.isMemberExpression() &&
        parentPath.node.object === node &&
        t.isIdentifier(parentPath.node.property, { name: 'current' })
      ) {
        return;
      }

      identifierPath.replaceWith(t.callExpression(t.identifier(node.name), []));
      identifierPath.skip();
    },
  });

  const solidImportSpecifiers = [];
  if (needsCreateSignal) solidImportSpecifiers.push(t.importSpecifier(t.identifier('createSignal'), t.identifier('createSignal')));
  if (needsCreateMemo) solidImportSpecifiers.push(t.importSpecifier(t.identifier('createMemo'), t.identifier('createMemo')));
  if (needsCreateUniqueId) solidImportSpecifiers.push(t.importSpecifier(t.identifier('createUniqueId'), t.identifier('createUniqueId')));
  if (needsUseTransition) solidImportSpecifiers.push(t.importSpecifier(t.identifier('useTransition'), t.identifier('useTransition')));
  if (needsCreateEffect) solidImportSpecifiers.push(t.importSpecifier(t.identifier('createEffect'), t.identifier('createEffect')));
  if (needsOnCleanup) solidImportSpecifiers.push(t.importSpecifier(t.identifier('onCleanup'), t.identifier('onCleanup')));
  if (needsComponentProps) solidImportSpecifiers.push(t.importSpecifier(t.identifier('ComponentProps'), t.identifier('ComponentProps')));

  if (solidImportSpecifiers.length > 0) {
    const existing = ast.program.body.find(
      (node) => t.isImportDeclaration(node) && node.source.value === 'solid-js',
    );

    if (existing && t.isImportDeclaration(existing)) {
      const names = new Set(
        existing.specifiers
          .filter((specifier) => t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported))
          .map((specifier) => specifier.imported.name),
      );

      for (const specifier of solidImportSpecifiers) {
        if (!names.has(specifier.imported.name)) {
          existing.specifiers.push(specifier);
        }
      }

      existing.specifiers = existing.specifiers.sort((a, b) => {
        const aName = t.isImportSpecifier(a) && t.isIdentifier(a.imported) ? a.imported.name : '';
        const bName = t.isImportSpecifier(b) && t.isIdentifier(b.imported) ? b.imported.name : '';
        return aName.localeCompare(bName);
      });
    } else {
      ast.program.body.unshift(
        t.importDeclaration(
          solidImportSpecifiers,
          t.stringLiteral('solid-js'),
        ),
      );
    }
  }

  let output = recast.print(ast, { quote: 'single' }).code;
  output = normalizeReactTypes(output);
  output = output.replaceAll(/import\s+\* as React from 'react';\n?/g, '');
  output = output.replaceAll(/import\s+'use client';\n?/g, '');
  output = output.replaceAll(/React\.Fragment/g, 'Fragment');
  output = output.replaceAll(/const\s+(\w+)\s*=\s*createMemo\(\(\)\s*=>\s*([^;]+)\);/g, 'const $1 = createMemo(() => $2);');
  output = output.replaceAll(/React\.useState/g, 'createSignal');
  output = output.replaceAll(/React\.useMemo/g, 'createMemo');
  output = output.replaceAll(/React\.useId/g, 'createUniqueId');
  output = output.replaceAll(/React\.useTransition/g, 'useTransition');
  output = output.replaceAll(/React\.useEffect/g, 'createEffect');
  output = output.replaceAll(/React\.useCallback/g, '');
  output = output.replaceAll(/className=/g, 'class=');
  output = output.replaceAll(/(\w+)\.current/g, '$1');

  if (output.includes('useImperativeHandle(') || output.includes('@tanstack/react-virtual')) {
    return null;
  }

  return output;
}

function copyDirectory(sourceDir, targetDir, { transformReact = false, manualSkip = new Set() } = {}) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = path.relative(sourceDir, sourcePath);
    const targetPath = path.join(targetDir, relativePath);

    if (entry.isDirectory()) {
      const demoKey = `${path.basename(targetDir)}/${entry.name}`;
      if (manualSkip.has(demoKey)) {
        continue;
      }
      copyDirectory(sourcePath, path.join(targetDir, entry.name), { transformReact, manualSkip });
      continue;
    }

    if (entry.name === 'index.ts') {
      continue;
    }

    if (manualSkip.has(demoKeyFromPath(sourcePath))) {
      continue;
    }

    if (
      transformReact &&
      (sourcePath.endsWith('.ts') || sourcePath.endsWith('.tsx') || sourcePath.endsWith('.js') || sourcePath.endsWith('.jsx'))
    ) {
      const transformed = transformReactFile(
        fs.readFileSync(sourcePath, 'utf-8'),
        sourcePath,
        targetPath,
      );

      if (transformed == null) {
        continue;
      }

      ensureDirectory(targetPath);
      fs.writeFileSync(targetPath, transformed);
      continue;
    }

    ensureDirectory(targetPath);
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function copyRootHelpers(sourceDir, targetDir, transformReact, manualSkip) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.isDirectory() || entry.name === 'index.ts') {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (fs.existsSync(targetPath)) {
      continue;
    }

    if (manualSkip.has(demoKeyFromPath(sourcePath))) {
      continue;
    }

    if (
      transformReact &&
      (sourcePath.endsWith('.ts') || sourcePath.endsWith('.tsx') || sourcePath.endsWith('.js') || sourcePath.endsWith('.jsx'))
    ) {
      const transformed = transformReactFile(
        fs.readFileSync(sourcePath, 'utf-8'),
        sourcePath,
        targetPath,
      );

      if (transformed == null) {
        continue;
      }

      ensureDirectory(targetPath);
      fs.writeFileSync(targetPath, transformed);
      continue;
    }

    ensureDirectory(targetPath);
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function getDemoKeys(componentDir) {
  const demosDir = path.join(componentDir, 'demos');
  if (!fs.existsSync(demosDir)) {
    return [];
  }

  return fs
    .readdirSync(demosDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((demoName) => fs.existsSync(path.join(demosDir, demoName, 'index.ts')))
    .sort();
}

function main() {
  const reactComponentsDir = path.join(reactRoot, 'src', 'app', '(docs)', 'react', 'components');
  const legacyComponentsDir = path.join(legacySolidRoot, 'src', 'routes', '(public)', '(content)', 'solid', 'components');

  for (const componentEntry of fs.readdirSync(reactComponentsDir, { withFileTypes: true })) {
    if (!componentEntry.isDirectory()) {
      continue;
    }

    const component = componentEntry.name;
    const sourceComponentDir = path.join(reactComponentsDir, component, 'demos');
    const legacyComponentDir = path.join(legacyComponentsDir, component, 'demos');
    const targetComponentDir = path.join(targetRoot, component);

    fs.mkdirSync(targetComponentDir, { recursive: true });

    copyDirectory(legacyComponentDir, targetComponentDir, { transformReact: false, manualSkip: manualDemos });
    copyRootHelpers(legacyComponentDir, targetComponentDir, false, manualDemos);

    const legacyDemos = new Set(getDemoKeys(path.join(legacyComponentsDir, component)));
    const reactDemos = getDemoKeys(path.join(reactComponentsDir, component));
    const missingDemos = reactDemos.filter((demo) => !legacyDemos.has(demo));

    for (const demo of missingDemos) {
      if (manualDemos.has(`${component}/${demo}`)) {
        continue;
      }

      const sourceDemoDir = path.join(sourceComponentDir, demo);
      const targetDemoDir = path.join(targetComponentDir, demo);
      copyDirectory(sourceDemoDir, targetDemoDir, { transformReact: true, manualSkip: manualDemos });
    }

    copyRootHelpers(sourceComponentDir, targetComponentDir, true, manualDemos);
  }

  const skipped = [...manualDemos].filter((demoKey) => {
    const [component, demo] = demoKey.split('/');
    const targetDemoDir = path.join(targetRoot, component, demo);
    return !fs.existsSync(targetDemoDir);
  });

  if (skipped.length > 0) {
    console.log(`Skipped manual demos: ${skipped.join(', ')}`);
  }
}

main();
