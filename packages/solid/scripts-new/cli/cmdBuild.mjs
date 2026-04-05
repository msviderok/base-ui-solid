/* eslint-disable no-console */
import { globby } from 'globby';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { sep as posixSep } from 'node:path/posix';
import { getOutExtension, isMjsBuild, mapConcurrently, validatePkgJson } from '../utils/build.mjs';
import { babelBuild } from '../utils/babel.mjs';
import { createTypes } from '../utils/typescript.mjs';

const validBundles = ['cjs', 'esm'];

async function getWorkspacePackageVersions(cwd) {
  const workspaceDir = path.resolve(cwd, '..', '..');
  const packageJsonFiles = await globby('**/package.json', {
    cwd: workspaceDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/.next/**'],
  });
  const versions = new Map();

  await Promise.all(
    packageJsonFiles.map(async (packageJsonFile) => {
      const packageJson = JSON.parse(await fs.readFile(packageJsonFile, 'utf8'));
      if (packageJson.name && packageJson.version) {
        versions.set(packageJson.name, packageJson.version);
      }
    }),
  );

  return versions;
}

function resolveWorkspaceProtocolRange(range, version) {
  if (typeof range !== 'string' || !range.startsWith('workspace:')) {
    return range;
  }

  const protocolValue = range.slice('workspace:'.length);

  if (protocolValue === '*' || protocolValue === '') {
    return version;
  }

  if (protocolValue === '^') {
    return `^${version}`;
  }

  if (protocolValue === '~') {
    return `~${version}`;
  }

  return protocolValue;
}

function resolveWorkspaceProtocols(dependencies, workspacePackageVersions) {
  if (!dependencies) {
    return dependencies;
  }

  return Object.fromEntries(
    Object.entries(dependencies).map(([dependencyName, range]) => {
      const resolvedVersion = workspacePackageVersions.get(dependencyName);
      if (!resolvedVersion) {
        return [dependencyName, range];
      }

      return [dependencyName, resolveWorkspaceProtocolRange(range, resolvedVersion)];
    }),
  );
}

/**
 * @param {Object} options
 * @param {string} options.name
 * @param {string} options.version
 * @param {string} options.license
 * @param {'esm' | 'cjs'} options.bundle
 * @param {string} options.outputDir
 */
async function addLicense({ name, version, license, bundle, outputDir }) {
  const outExtension = getOutExtension(bundle);
  const file = path.join(outputDir, `index${outExtension}`);
  const fileExists = await fs
    .stat(file)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (!fileExists) {
    return;
  }

  const content = await fs.readFile(file, { encoding: 'utf8' });
  await fs.writeFile(
    file,
    `/**\n * ${name} v${version}\n *\n * @license ${license}\n * This source code is licensed under the ${license} license found in the\n * LICENSE file in the root directory of this source tree.\n */\n${content}`,
    { encoding: 'utf8' },
  );
  console.log(`License added to ${file}`);
}

/**
 * @param {Object} param0
 * @param {NonNullable<Record<string, any>>} param0.importPath
 * @param {string} param0.key
 * @param {string} param0.cwd
 * @param {string} param0.dir
 * @param {'esm' | 'cjs'} param0.type
 * @param {Record<string, any>} param0.newExports
 * @param {string} param0.typeOutExtension
 * @param {string} param0.outExtension
 * @param {boolean} param0.addTypes
 */
async function createExportsFor({
  importPath,
  key,
  cwd,
  dir,
  type,
  newExports,
  typeOutExtension,
  outExtension,
  addTypes,
}) {
  if (Array.isArray(importPath)) {
    throw new Error(
      `Array form of package.json exports is not supported yet. Found in export "${key}".`,
    );
  }

  let srcPath = typeof importPath === 'string' ? importPath : importPath['mui-src'];
  const rest = typeof importPath === 'string' ? {} : { ...importPath };
  delete rest['mui-src'];

  if (typeof srcPath !== 'string') {
    throw new Error(
      `Unsupported export for "${key}". Only a string or an object with "mui-src" field is supported for now.`,
    );
  }

  const exportFileExists = srcPath.includes('*')
    ? true
    : await fs
        .stat(path.join(cwd, srcPath))
        .then((stats) => stats.isFile() || stats.isDirectory())
        .catch(() => false);

  if (!exportFileExists) {
    throw new Error(
      `The import path "${srcPath}" for export "${key}" does not exist in the package. ` +
        'Either remove the export or add the file/folder to the package.',
    );
  }

  srcPath = srcPath.replace(/\.\/src\//, `./${dir === '.' ? '' : `${dir}/`}`);
  const ext = path.extname(srcPath);

  if (ext === '.css') {
    newExports[key] = srcPath;
    return;
  }

  if (typeof newExports[key] === 'string' || Array.isArray(newExports[key])) {
    throw new Error(`The export "${key}" is already defined as a string or Array.`);
  }

  newExports[key] ??= {};
  newExports[key][type === 'cjs' ? 'require' : 'import'] = {
    ...rest,
    ...(addTypes ? { types: srcPath.replace(ext, typeOutExtension) } : {}),
    default: srcPath.replace(ext, outExtension),
  };
}

/**
 * @param {Object} param0
 * @param {Record<string, any>} param0.packageJson
 * @param {{ type: 'esm' | 'cjs'; dir: string }[]} param0.bundles
 * @param {string} param0.outputDir
 * @param {string} param0.cwd
 * @param {boolean} [param0.addTypes=false]
 */
async function writePackageJson({ packageJson, bundles, outputDir, cwd, addTypes = false }) {
  const outputPackageJson = structuredClone(packageJson);
  const workspacePackageVersions = await getWorkspacePackageVersions(cwd);
  delete outputPackageJson.scripts;
  delete outputPackageJson.publishConfig?.directory;
  delete outputPackageJson.devDependencies;
  delete outputPackageJson.imports;

  if (outputPackageJson.private === false) {
    delete outputPackageJson.private;
  }

  outputPackageJson.dependencies = resolveWorkspaceProtocols(
    outputPackageJson.dependencies,
    workspacePackageVersions,
  );
  outputPackageJson.peerDependencies = resolveWorkspaceProtocols(
    outputPackageJson.peerDependencies,
    workspacePackageVersions,
  );
  outputPackageJson.optionalDependencies = resolveWorkspaceProtocols(
    outputPackageJson.optionalDependencies,
    workspacePackageVersions,
  );

  outputPackageJson.type = outputPackageJson.type || 'commonjs';

  const originalExports =
    typeof outputPackageJson.exports === 'string' || Array.isArray(outputPackageJson.exports)
      ? { '.': outputPackageJson.exports }
      : outputPackageJson.exports || {};
  delete outputPackageJson.exports;

  const newExports = {
    './package.json': './package.json',
  };

  await Promise.all(
    bundles.map(async ({ type, dir }) => {
      const outExtension = getOutExtension(type);
      const typeOutExtension = getOutExtension(type, true);
      const indexFileExists = await fs
        .stat(path.join(outputDir, dir, `index${outExtension}`))
        .then((stats) => stats.isFile())
        .catch(() => false);
      const typeFileExists =
        addTypes &&
        (await fs
          .stat(path.join(outputDir, dir, `index${typeOutExtension}`))
          .then((stats) => stats.isFile())
          .catch(() => false));
      const dirPrefix = dir === '.' ? '' : `${dir}/`;
      const exportDir = `./${dirPrefix}index${outExtension}`;
      const typeExportDir = `./${dirPrefix}index${typeOutExtension}`;

      if (indexFileExists) {
        if (type === 'cjs') {
          outputPackageJson.main = exportDir;
        }

        if (typeof newExports['.'] === 'string' || Array.isArray(newExports['.'])) {
          throw new Error('The export "." is already defined as a string or Array.');
        }

        newExports['.'] ??= {};
        newExports['.'][type === 'cjs' ? 'require' : 'import'] = {
          ...(typeFileExists ? { types: typeExportDir } : {}),
          default: exportDir,
        };
      }

      if (typeFileExists && type === 'cjs') {
        outputPackageJson.types = typeExportDir;
      }

      for (const key of Object.keys(originalExports)) {
        const importPath = originalExports[key];
        if (!importPath) {
          newExports[key] = null;
          continue;
        }

        await createExportsFor({
          importPath,
          key,
          cwd,
          dir,
          type,
          newExports,
          typeOutExtension,
          outExtension,
          addTypes,
        });
      }
    }),
  );

  bundles.forEach(({ dir }) => {
    if (dir !== '.') {
      newExports[`./${dir}`] = null;
    }
  });

  Object.keys(newExports).forEach((key) => {
    const exportValue = newExports[key];
    if (Array.isArray(exportValue)) {
      throw new Error(
        `Array form of package.json exports is not supported yet. Found in export "${key}".`,
      );
    }

    if (exportValue && typeof exportValue === 'object' && (exportValue.import || exportValue.require)) {
      const defaultExport = exportValue.import || exportValue.require;
      if (exportValue.import) {
        delete exportValue.import;
      } else if (exportValue.require) {
        delete exportValue.require;
      }
      exportValue.default = defaultExport;
    }
  });

  outputPackageJson.exports = newExports;

  await fs.writeFile(
    path.join(outputDir, 'package.json'),
    JSON.stringify(outputPackageJson, null, 2),
    'utf-8',
  );
}

/**
 * @param {Object} param0
 * @param {string} param0.cwd
 * @param {string[]} [param0.globs=[]]
 * @param {string} param0.buildDir
 * @param {boolean} [param0.verbose=false]
 */
async function copyHandler({ cwd, globs = [], buildDir, verbose = false }) {
  const filesToCopy = [];
  const workspaceDir = path.resolve(cwd, '..', '..');

  const localOrRootFiles = [
    [path.join(cwd, 'README.md'), path.join(workspaceDir, 'README.md')],
    [path.join(cwd, 'LICENSE'), path.join(workspaceDir, 'LICENSE')],
    [path.join(cwd, 'CHANGELOG.md'), path.join(workspaceDir, 'CHANGELOG.md')],
  ];

  await Promise.all(
    localOrRootFiles.map(async (candidates) => {
      for (const file of candidates) {
        const exists = await fs
          .stat(file)
          .then(() => true)
          .catch(() => false);

        if (exists) {
          filesToCopy.push(file);
          break;
        }
      }
    }),
  );

  if (globs.length) {
    const resolvedPatterns = globs.map((globPattern) => {
      const [pattern, baseDir] = globPattern.split(':');
      return { pattern, baseDir };
    });

    const globCache = new Map();
    const matchedFiles = await Promise.all(
      resolvedPatterns.map(async ({ pattern, baseDir }) => {
        if (!globCache.has(pattern)) {
          globCache.set(pattern, globby(pattern, { cwd }));
        }

        return {
          files: (await globCache.get(pattern)) ?? [],
          baseDir,
        };
      }),
    );

    matchedFiles.forEach(({ files, baseDir }) => {
      files.forEach((file) => {
        const sourcePath = path.resolve(cwd, file);
        const pathSegments = file.split(posixSep);
        const relativePath =
          pathSegments.slice(pathSegments[0] === '.' ? 2 : 1).join(posixSep) || file;
        const targetPath = baseDir
          ? path.resolve(buildDir, baseDir, relativePath)
          : path.resolve(buildDir, relativePath);

        filesToCopy.push({ sourcePath, targetPath });
      });
    });
  }

  if (!filesToCopy.length && verbose) {
    console.log('⓿ No files to copy.');
  }

  await mapConcurrently(
    filesToCopy,
    async (file) => {
      if (typeof file === 'string') {
        const targetPath = path.join(buildDir, path.basename(file));
        await recursiveCopy({ source: file, target: targetPath, verbose });
        return;
      }

      await fs.mkdir(path.dirname(file.targetPath), { recursive: true });
      await recursiveCopy({ source: file.sourcePath, target: file.targetPath, verbose });
    },
    20,
  );

  console.log(`📋 Copied ${filesToCopy.length} files.`);
}

/**
 * @param {{ source: string; target: string; verbose?: boolean }} options
 */
async function recursiveCopy({ source, target, verbose = true }) {
  try {
    await fs.cp(source, target, { recursive: true });
    if (verbose) {
      console.log(`Copied ${source} to ${target}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    if (verbose) {
      console.warn(`Source does not exist: ${source}`);
    }

    throw error;
  }
}

/**
 * @param {Record<string, any>} args
 */
export async function runBuild(args) {
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, { encoding: 'utf8' }));
  validatePkgJson(packageJson);

  const buildDirBase = packageJson.publishConfig.directory;
  const buildDir = path.join(cwd, buildDirBase);
  const bundles = args.bundle ?? ['esm', 'cjs'];

  console.log(`Selected output directory: "${buildDirBase}"`);

  await fs.rm(buildDir, { recursive: true, force: true });

  const babelRuntimeVersion = packageJson.dependencies?.['@babel/runtime'];
  if (!babelRuntimeVersion && !args.skipBabelRuntimeCheck) {
    throw new Error(
      'package.json needs to have a dependency on `@babel/runtime` ' +
        'when building with `@babel/plugin-transform-runtime`.',
    );
  }

  if (!bundles.length) {
    throw new Error('No bundles specified. Use --bundle to specify which bundles to build.');
  }

  const relativeOutDirs = {
    cjs: args.cjsOutDir ?? '.',
    esm: 'esm',
  };
  const sourceDir = path.join(cwd, 'src');

  await Promise.all(
    bundles.map(async (bundle) => {
      const outExtension = getOutExtension(bundle);
      const relativeOutDir = relativeOutDirs[bundle];
      const outputDir = path.join(buildDir, relativeOutDir);
      await fs.mkdir(outputDir, { recursive: true });

      await babelBuild({
        cwd,
        sourceDir,
        outDir: outputDir,
        babelRuntimeVersion,
        hasLargeFiles: args.hasLargeFiles ?? false,
        bundle,
        verbose: args.verbose ?? false,
        optimizeClsx:
          packageJson.dependencies?.clsx !== undefined ||
          packageJson.dependencies?.classnames !== undefined,
        removePropTypes: packageJson.dependencies?.['prop-types'] !== undefined,
        pkgVersion: packageJson.version,
        ignores: args.ignore ?? [],
        outExtension,
      });

      if (buildDir !== outputDir && !args.skipBundlePackageJson && !isMjsBuild) {
        await fs.writeFile(
          path.join(outputDir, 'package.json'),
          JSON.stringify({
            type: bundle === 'esm' ? 'module' : 'commonjs',
            sideEffects: packageJson.sideEffects ?? false,
          }),
        );
      }

      await addLicense({
        bundle,
        license: packageJson.license,
        name: packageJson.name,
        version: packageJson.version,
        outputDir,
      });
    }),
  );

  if (args.buildTypes !== false) {
    await createTypes({
      bundles: bundles.map((type) => ({
        type,
        dir: relativeOutDirs[type] === './' ? '.' : relativeOutDirs[type],
      })),
      srcDir: sourceDir,
      cwd,
      skipTsc: args.skipTsc ?? false,
      buildDir,
      packageName: packageJson.name,
      noCheck: args.noCheck ?? false,
    });
  }

  if (args.skipPackageJson) {
    console.log('Skipping package.json generation in the output directory.');
    return;
  }

  const normalizedCjsOutDir =
    relativeOutDirs.cjs === '.' || relativeOutDirs.cjs === './' ? '.' : relativeOutDirs.cjs;

  await writePackageJson({
    cwd,
    packageJson,
    bundles: bundles.map((type) => ({
      type,
      dir: type === 'esm' ? 'esm' : normalizedCjsOutDir,
    })),
    outputDir: buildDir,
    addTypes: args.buildTypes !== false,
  });

  await copyHandler({
    cwd,
    globs: args.copy ?? [],
    buildDir,
    verbose: args.verbose ?? false,
  });
}

export const buildCommand = {
  name: 'build',
  description: 'Builds the Solid package for publishing.',
  run: runBuild,
  validBundles,
};
