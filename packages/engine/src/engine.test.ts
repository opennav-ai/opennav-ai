import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenNavError } from "./common/types/opennav-error";
import { Engine } from "./engine";
import * as publicExports from "./index";
import type { EngineExecuteInput } from "./types/engine-execute-input";
import type { EngineExecuteResult } from "./types/engine-execute-result";

const PHASE_1_SMALL_SITE_FIXTURE_DIRECTORY = fileURLToPath(
  new URL("../fixtures/phase-1-small-site/dist", import.meta.url),
);

type OutputFileMap = Readonly<Record<string, string>>;

describe("Engine", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("is exported from the public package entrypoint", (): void => {
    expect(publicExports.Engine).toEqual(Engine);
  });

  it("keeps Engine as the only runtime export", (): void => {
    expect(Object.keys(publicExports).sort()).toEqual(["Engine"]);
  });

  it("reads built file paths and returns unsupported files as skipped warnings", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const htmlFilePath = "index.html";
    const unsupportedFilePath = "image.png";
    await mkdir(outputDirectory);
    await writeFile(
      join(outputDirectory, htmlFilePath),
      "<html><head><title>Home</title></head></html>",
      "utf8",
    );
    await writeFile(join(outputDirectory, unsupportedFilePath), "PNG", "utf8");
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [htmlFilePath, unsupportedFilePath],
    };

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        createdFilePaths: [
          "llms.txt",
          ".well-known/llms.txt",
          "index.md",
          "llms-full.txt",
          ".well-known/llms-full.txt",
          ".well-known/opennav.json",
        ],
        modifiedFilePaths: [htmlFilePath],
        skippedFilePaths: [unsupportedFilePath],
        warnings: [
          {
            code: "ENGINE_FILE_UNSUPPORTED",
            message: "The engine skipped an unsupported built site file.",
            context: {
              filePath: unsupportedFilePath,
              kind: "unsupported",
            },
          },
        ],
      });
    }
  });

  it("returns an exact typed error when a built file cannot be read", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "missing.html";
    const absoluteFilePath = join(outputDirectory, filePath);
    await mkdir(outputDirectory);
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [filePath],
    };

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "ENGINE_FILE_READ_FAILED",
        message: "The engine could not read the built site file.",
        context: {
          outputDirectory,
          filePath,
          cause: `ENOENT: no such file or directory, access '${absoluteFilePath}'`,
        },
      });
    }
  });

  it("returns an exact dry-run report for a small static site without writing files", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await cp(PHASE_1_SMALL_SITE_FIXTURE_DIRECTORY, outputDirectory, {
      recursive: true,
    });
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [
        "index.html",
        "docs/getting-started/index.html",
        "docs/api/index.html",
        "docs/reference/index.md",
        "robots.txt",
        "assets/logo.svg",
      ],
      accessGuidance: {
        contentSignals: {
          search: "allow",
          aiInput: "allow",
          aiTrain: "disallow",
        },
      },
    };
    const beforeFileMap = await readOutputFileMap(outputDirectory);

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        afterFileMap: await readOutputFileMap(outputDirectory),
        generatedFileExists: {
          llmsTxt: await pathExists(join(outputDirectory, "llms.txt")),
          wellKnownLlmsTxt: await pathExists(
            join(outputDirectory, ".well-known/llms.txt"),
          ),
          indexMarkdown: await pathExists(join(outputDirectory, "index.md")),
          gettingStartedMarkdown: await pathExists(
            join(outputDirectory, "docs/getting-started/index.md"),
          ),
          apiMarkdown: await pathExists(
            join(outputDirectory, "docs/api/index.md"),
          ),
          llmsFullTxt: await pathExists(join(outputDirectory, "llms-full.txt")),
          wellKnownLlmsFullTxt: await pathExists(
            join(outputDirectory, ".well-known/llms-full.txt"),
          ),
          manifest: await pathExists(
            join(outputDirectory, ".well-known/opennav.json"),
          ),
        },
      }).toEqual({
        result: {
          createdFilePaths: [
            "llms.txt",
            ".well-known/llms.txt",
            "index.md",
            "docs/getting-started/index.md",
            "docs/api/index.md",
            "llms-full.txt",
            ".well-known/llms-full.txt",
            ".well-known/opennav.json",
          ],
          modifiedFilePaths: [
            "index.html",
            "docs/getting-started/index.html",
            "docs/api/index.html",
            "robots.txt",
          ],
          skippedFilePaths: ["assets/logo.svg"],
          warnings: [
            {
              code: "ENGINE_FILE_UNSUPPORTED",
              message: "The engine skipped an unsupported built site file.",
              context: {
                filePath: "assets/logo.svg",
                kind: "unsupported",
              },
            },
          ],
        },
        afterFileMap: beforeFileMap,
        generatedFileExists: {
          llmsTxt: false,
          wellKnownLlmsTxt: false,
          indexMarkdown: false,
          gettingStartedMarkdown: false,
          apiMarkdown: false,
          llmsFullTxt: false,
          wellKnownLlmsFullTxt: false,
          manifest: false,
        },
      });
    }
  });
});

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (cause: unknown) {
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "ENOENT"
    ) {
      return false;
    }

    throw cause;
  }
}

async function readOutputFileMap(
  outputDirectory: string,
): Promise<OutputFileMap> {
  const fileMap: Record<string, string> = {};
  await readOutputFiles(outputDirectory, "", fileMap);

  return Object.fromEntries(
    Object.entries(fileMap).sort(([firstPath], [secondPath]): number =>
      firstPath.localeCompare(secondPath),
    ),
  );
}

async function readOutputFiles(
  outputDirectory: string,
  relativeDirectoryPath: string,
  fileMap: Record<string, string>,
): Promise<void> {
  const directoryPath =
    relativeDirectoryPath === ""
      ? outputDirectory
      : join(outputDirectory, relativeDirectoryPath);
  const entries = await readdir(directoryPath, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const outputFilePath =
      relativeDirectoryPath === ""
        ? entry.name
        : `${relativeDirectoryPath}/${entry.name}`;

    if (entry.isDirectory()) {
      await readOutputFiles(outputDirectory, outputFilePath, fileMap);
      continue;
    }

    fileMap[outputFilePath] = await readFile(
      join(outputDirectory, outputFilePath),
      "utf8",
    );
  }
}
