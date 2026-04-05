/* eslint-disable no-console */
import * as babel from '@babel/core';
import pluginTypescriptSyntax from '@babel/plugin-syntax-typescript';
import pluginResolveImports from '@mui/internal-babel-plugin-resolve-imports';
import pluginRemoveImports from 'babel-plugin-transform-remove-imports';
import { globby } from 'globby';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { isMjsBuild, mapConcurrently, runCommand } from './build.mjs';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPosixPath(value) {
  return value.split(path.sep).join(path.posix.sep);
}

function rewriteSelfImports(code, { declarationFile, bundleRoot, packageName }) {
  const packageImportPattern = new RegExp(
    `(['"])${escapeRegExp(packageName)}(?:\\/([^'"\\n]+))?\\1`,
    'g',
  );

  return code.replace(packageImportPattern, (_, quote, subpath = '') => {
    const targetPath = path.resolve(bundleRoot, subpath ? `${subpath}.js` : 'index.js');
    let relativePath = path.relative(path.dirname(declarationFile), targetPath);
    relativePath = toPosixPath(relativePath);

    if (!relativePath.startsWith('.')) {
      relativePath = `./${relativePath}`;
    }

    return `${quote}${relativePath}${quote}`;
  });
}

/**
 * @param {string} tsconfig
 * @param {string} outDir
 * @param {boolean} [noCheck=false]
 */
export async function emitDeclarations(tsconfig, outDir, noCheck = false) {
  const tsconfigDir = path.dirname(tsconfig);
  const rootDir = path.resolve(tsconfigDir, './src');

  const args = [
    'exec',
    'tsc',
    '-p',
    tsconfig,
    '--rootDir',
    rootDir,
    '--outDir',
    outDir,
    '--declaration',
    '--emitDeclarationOnly',
    '--noEmit',
    'false',
    '--composite',
    'false',
    '--incremental',
    'false',
    '--declarationMap',
    'false',
  ];

  if (noCheck) {
    args.push('--noCheck');
  }

  await runCommand('pnpm', args, {
    cwd: tsconfigDir,
  });
}

/**
 * @param {string} sourceDirectory
 * @param {string} destinationDirectory
 */
export async function copyDeclarations(sourceDirectory, destinationDirectory) {
  const fullSourceDirectory = path.resolve(sourceDirectory);
  const fullDestinationDirectory = path.resolve(destinationDirectory);

  console.log(`Copying declarations from ${fullSourceDirectory} to ${fullDestinationDirectory}`);

  await fs.cp(fullSourceDirectory, fullDestinationDirectory, {
    recursive: true,
    filter: async (src) => {
      const stats = await fs.stat(src);
      if (stats.isDirectory()) {
        return !path.basename(src).startsWith('.');
      }

      return src.endsWith('.d.ts') || src.endsWith('.d.mts');
    },
  });
}

/**
 * @param {{ directory: string; packageName: string }} param0
 */
async function postProcessDeclarations({ directory, packageName }) {
  const dtsFiles = await globby(['**/*.d.ts', '**/*.d.mts'], {
    absolute: true,
    cwd: directory,
  });

  if (dtsFiles.length === 0) {
    console.log(`No declaration files found in ${directory}. Skipping post-processing.`);
    return;
  }

  const babelPlugins = [
    [pluginTypescriptSyntax, { dts: true }],
    [pluginResolveImports],
    [pluginRemoveImports, { test: /\.css$/ }],
  ];

  await mapConcurrently(
    dtsFiles,
    async (declarationFile) => {
      const result = await babel.transformFileAsync(declarationFile, {
        configFile: false,
        plugins: babelPlugins,
      });

      if (typeof result?.code !== 'string') {
        throw new Error(`Failed to transform declaration file "${declarationFile}".`);
      }

      const rewrittenCode = rewriteSelfImports(result.code, {
        declarationFile,
        bundleRoot: directory,
        packageName,
      });

      await fs.writeFile(declarationFile, rewrittenCode);
    },
    20,
  );
}

/**
 * @param {{ directory: string }} param0
 */
async function renameDeclarations({ directory }) {
  const dtsFiles = await globby('**/*.d.ts', { absolute: true, cwd: directory });

  await mapConcurrently(
    dtsFiles,
    async (dtsFile) => {
      await fs.rename(dtsFile, dtsFile.replace(/\.d\.ts$/, '.d.mts'));
    },
    20,
  );
}

/**
 * @param {Object} param0
 * @param {{ type: 'esm' | 'cjs'; dir: string }[]} param0.bundles
 * @param {string} param0.srcDir
 * @param {string} param0.buildDir
 * @param {string} param0.cwd
 * @param {boolean} param0.skipTsc
 * @param {string} param0.packageName
 * @param {boolean} [param0.noCheck=false]
 */
export async function createTypes({ bundles, srcDir, buildDir, cwd, skipTsc, packageName, noCheck = false }) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'base-ui-solid-build-tsc-'));

  try {
    await copyDeclarations(srcDir, tmpDir);

    const tsconfigPath = path.join(cwd, 'tsconfig.build.json');
    const tsconfigExists = await fs
      .stat(tsconfigPath)
      .then((file) => file.isFile())
      .catch(() => false);

    if (!skipTsc) {
      if (!tsconfigExists) {
        throw new Error(
          'Unable to find a tsconfig to build this project. ' +
            `The package root needs to contain a "tsconfig.build.json". ` +
            `The package root is "${cwd}".`,
        );
      }

      console.log(`Building types for ${tsconfigPath} in ${tmpDir}`);
      await emitDeclarations(tsconfigPath, tmpDir, noCheck);
    }

    for (const bundle of bundles) {
      const fullOutDir = path.join(buildDir, bundle.dir);

      await fs.cp(tmpDir, fullOutDir, {
        recursive: true,
        force: false,
      });

      await postProcessDeclarations({
        directory: fullOutDir,
        packageName,
      });

      if (bundle.type === 'esm' && isMjsBuild) {
        await renameDeclarations({
          directory: fullOutDir,
        });
      }
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
