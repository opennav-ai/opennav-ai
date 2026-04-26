import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenNavError } from "./common/types/opennav-error";
import { Engine } from "./engine";
import * as publicExports from "./index";
import type { EngineExecuteInput } from "./types/engine-execute-input";
import type { EngineExecuteResult } from "./types/engine-execute-result";

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
        createdFilePaths: [],
        modifiedFilePaths: [],
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
          cause: `ENOENT: no such file or directory, open '${absoluteFilePath}'`,
        },
      });
    }
  });
});
