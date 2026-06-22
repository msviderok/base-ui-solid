import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, '..');
const buildDir = path.join(packageRoot, 'build');
const buildPackageJsonPath = path.join(buildDir, 'package.json');

const packageJson = JSON.parse(await fs.readFile(buildPackageJsonPath, 'utf8'));
const packageName = packageJson.name;
const exportSubpaths = Object.keys(packageJson.exports).filter(
  (subpath) => subpath !== './package.json',
);

const specifiers = exportSubpaths.map((subpath) => {
  if (subpath === '.') {
    return packageName;
  }

  return `${packageName}/${subpath.slice(2)}`;
});

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'base-ui-solid-exports-'));

try {
  const scopeDir = path.join(tempDir, 'node_modules', '@msviderok');
  await fs.mkdir(scopeDir, { recursive: true });
  await fs.symlink(buildDir, path.join(scopeDir, 'base-ui-solid'), 'dir');

  const modes = [
    {
      name: 'server ESM',
      args: ['--conditions=node', '--input-type=module', '--eval', createEsmScript(specifiers)],
    },
    {
      name: 'browser ESM',
      args: ['--conditions=browser', '--input-type=module', '--eval', createEsmScript(specifiers)],
    },
    {
      name: 'server CJS',
      args: ['--conditions=node', '--eval', createCjsScript(specifiers)],
    },
    {
      name: 'browser CJS',
      args: ['--conditions=browser', '--eval', createCjsScript(specifiers)],
    },
  ];

  for (const mode of modes) {
    const result = childProcess.spawnSync(process.execPath, mode.args, {
      cwd: tempDir,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      throw new Error(
        [
          `Package export resolution failed in ${mode.name}.`,
          result.stdout.trim(),
          result.stderr.trim(),
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }
  }
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

function createEsmScript(specifiersToImport) {
  return `
const specifiers = ${JSON.stringify(specifiersToImport)};
for (const specifier of specifiers) {
  try {
    await import(specifier);
  } catch (error) {
    console.error(\`Failed to import \${specifier}\`);
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
}
`;
}

function createCjsScript(specifiersToRequire) {
  return `
const specifiers = ${JSON.stringify(specifiersToRequire)};
for (const specifier of specifiers) {
  try {
    require(specifier);
  } catch (error) {
    console.error(\`Failed to require \${specifier}\`);
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
}
`;
}
