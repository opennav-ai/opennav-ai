import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoDirectory = resolve(scriptDirectory, "..");
const engineDirectory = join(repoDirectory, "packages/engine");
const rootNodeModulesDirectory = join(repoDirectory, "node_modules");
const npmCacheDirectory = join(repoDirectory, ".npm-cache");
const packageDependencies = ["js-tiktoken", "neverthrow", "parse5"];

/**
 * @typedef {{
 *   consumerName: string;
 *   extractedPackageDirectory: string;
 *   packageJson: Record<string, unknown>;
 *   source: string;
 *   tsconfig: Record<string, unknown>;
 * }} TypeConsumerCheckInput
 */

const tempDirectory = await mkdtemp(
  join(tmpdir(), "opennav-engine-package-types-"),
);
let shouldCleanup = false;

try {
  const packedPackagePath = await packEnginePackage(tempDirectory);
  const extractedPackageDirectory = await extractPackedPackage(
    packedPackagePath,
    tempDirectory,
  );

  await checkConsumer({
    consumerName: "esm-consumer",
    extractedPackageDirectory,
    packageJson: {
      name: "opennav-engine-esm-type-consumer",
      private: true,
      type: "module",
    },
    tsconfig: {
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: true,
        strict: true,
        target: "ES2022",
        types: [],
      },
      include: ["index.ts"],
    },
    source: [
      'import { Engine } from "@opennav-ai/engine";',
      'import type { EngineExecuteInput, EngineExecuteResult, OpenNavError } from "@opennav-ai/engine";',
      'import type { Result } from "neverthrow";',
      "",
      "const input: EngineExecuteInput = {",
      '  siteName: "Example Docs",',
      '  baseUrl: "https://example.com",',
      '  outputDirectory: "dist",',
      '  filePaths: ["index.html"],',
      "};",
      "",
      "const execution: Promise<Result<EngineExecuteResult, OpenNavError>> =",
      "  Engine.execute(input, { dryRun: true });",
      "",
      "execution.then((result: Result<EngineExecuteResult, OpenNavError>): void => {",
      "  if (result.isOk()) {",
      "    const createdFilePaths: readonly string[] =",
      "      result.value.createdFilePaths;",
      "    void createdFilePaths;",
      "  }",
      "});",
      "",
    ].join("\n"),
  });

  await checkConsumer({
    consumerName: "cjs-consumer",
    extractedPackageDirectory,
    packageJson: {
      name: "opennav-engine-cjs-type-consumer",
      private: true,
      type: "commonjs",
    },
    tsconfig: {
      compilerOptions: {
        module: "Node16",
        moduleResolution: "Node16",
        noEmit: true,
        strict: true,
        target: "ES2022",
        types: [],
      },
      include: ["index.ts"],
    },
    source: [
      'import enginePackage = require("@opennav-ai/engine");',
      'import type { EngineExecuteInput, EngineExecuteResult, OpenNavError } from "@opennav-ai/engine";',
      'import type { Result } from "neverthrow";',
      "",
      "const input: EngineExecuteInput = {",
      '  siteName: "Example Docs",',
      '  baseUrl: "https://example.com",',
      '  outputDirectory: "dist",',
      '  filePaths: ["index.html"],',
      "};",
      "",
      "const execution: Promise<Result<EngineExecuteResult, OpenNavError>> =",
      "  enginePackage.Engine.execute(input, { dryRun: true });",
      "",
      "execution.then((result: Result<EngineExecuteResult, OpenNavError>): void => {",
      "  if (result.isOk()) {",
      "    const warnings: readonly unknown[] = result.value.warnings;",
      "    void warnings;",
      "  }",
      "});",
      "",
    ].join("\n"),
  });

  shouldCleanup = true;
  console.log(
    JSON.stringify(
      {
        ok: true,
        package: "@opennav-ai/engine",
        checks: ["esm-types", "cjs-types"],
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        tempDirectory,
        error: formatUnknownError(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  if (shouldCleanup) {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

/**
 * @param {TypeConsumerCheckInput} input
 * @returns {Promise<void>}
 */
async function checkConsumer(input) {
  const consumerDirectory = join(tempDirectory, input.consumerName);
  const consumerNodeModulesDirectory = join(consumerDirectory, "node_modules");
  const consumerScopeDirectory = join(
    consumerNodeModulesDirectory,
    "@opennav-ai",
  );

  await mkdir(consumerScopeDirectory, { recursive: true });
  await cp(
    input.extractedPackageDirectory,
    join(consumerScopeDirectory, "engine"),
    { recursive: true },
  );
  await symlinkPackageDependencies(consumerNodeModulesDirectory);
  await writeJson(join(consumerDirectory, "package.json"), input.packageJson);
  await writeJson(join(consumerDirectory, "tsconfig.json"), input.tsconfig);
  await writeFile(join(consumerDirectory, "index.ts"), input.source, "utf8");

  await runTypeScript(consumerDirectory);
}

/**
 * @param {string} packedPackagePath
 * @param {string} parentDirectory
 * @returns {Promise<string>}
 */
async function extractPackedPackage(packedPackagePath, parentDirectory) {
  const extractDirectory = join(parentDirectory, "extracted");
  await mkdir(extractDirectory, { recursive: true });
  await execFileAsync("tar", [
    "-xzf",
    packedPackagePath,
    "-C",
    extractDirectory,
  ]);
  return join(extractDirectory, "package");
}

/**
 * @param {unknown} error
 * @returns {{ message: string; name: string; stderr?: unknown; stdout?: unknown }}
 */
function formatUnknownError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stderr: "stderr" in error ? error.stderr : undefined,
      stdout: "stdout" in error ? error.stdout : undefined,
    };
  }

  return {
    message: String(error),
    name: "UnknownError",
  };
}

/**
 * @param {string} destinationDirectory
 * @returns {Promise<string>}
 */
async function packEnginePackage(destinationDirectory) {
  const { stdout } = await execFileAsync(
    "npm",
    [
      "pack",
      "--json",
      "--pack-destination",
      destinationDirectory,
      "--cache",
      npmCacheDirectory,
    ],
    {
      cwd: engineDirectory,
    },
  );
  const packRecords = JSON.parse(stdout);
  const [packRecord] = packRecords;

  return join(destinationDirectory, packRecord.filename);
}

/**
 * @param {string} consumerDirectory
 * @returns {Promise<void>}
 */
async function runTypeScript(consumerDirectory) {
  const tscPath = join(rootNodeModulesDirectory, "typescript/bin/tsc");
  await execFileAsync(
    process.execPath,
    [tscPath, "--project", "tsconfig.json", "--pretty", "false"],
    {
      cwd: consumerDirectory,
    },
  );
}

/**
 * @param {string} consumerNodeModulesDirectory
 * @returns {Promise<void>}
 */
async function symlinkPackageDependencies(consumerNodeModulesDirectory) {
  await mkdir(consumerNodeModulesDirectory, { recursive: true });

  for (const dependencyName of packageDependencies) {
    await symlink(
      join(rootNodeModulesDirectory, dependencyName),
      join(consumerNodeModulesDirectory, dependencyName),
      "dir",
    );
  }
}

/**
 * @param {string} filePath
 * @param {unknown} value
 * @returns {Promise<void>}
 */
async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
