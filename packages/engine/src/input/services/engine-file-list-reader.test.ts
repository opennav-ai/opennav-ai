import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EngineFileListReader } from "./engine-file-list-reader";

describe("EngineFileListReader", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("returns lightweight file references and an exact warning for an unsupported file type", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-file-list-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const htmlFilePath = "index.html";
    const markdownFilePath = "docs/api.md";
    const unsupportedFilePath = "image.png";
    const htmlContent = "<html><head><title>Home</title></head></html>";
    const markdownContent = "# API\n\nUse the OpenNav AI engine.";
    await mkdir(outputDirectory);
    await mkdir(join(outputDirectory, "docs"));
    await writeFile(join(outputDirectory, htmlFilePath), htmlContent, "utf8");
    await writeFile(
      join(outputDirectory, markdownFilePath),
      markdownContent,
      "utf8",
    );
    await writeFile(join(outputDirectory, unsupportedFilePath), "PNG", "utf8");

    const reader = new EngineFileListReader();
    const result = await reader.read({
      outputDirectory,
      filePaths: [htmlFilePath, markdownFilePath, unsupportedFilePath],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        fileReferences: [
          {
            filePath: htmlFilePath,
            kind: "html",
          },
          {
            filePath: markdownFilePath,
            kind: "markdown",
          },
        ],
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

  it("returns an exact typed error for a missing supported file", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-file-list-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "missing.html";
    const absoluteFilePath = join(outputDirectory, filePath);
    await mkdir(outputDirectory);

    const reader = new EngineFileListReader();
    const result = await reader.read({
      outputDirectory,
      filePaths: [filePath],
    });

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

  it("returns an exact typed error for a supported path outside the output directory", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-file-list-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "../secrets.html";
    const absoluteFilePath = join(fixtureDirectory, "secrets.html");
    await mkdir(outputDirectory);
    await writeFile(absoluteFilePath, "<html>Private</html>", "utf8");

    const reader = new EngineFileListReader();
    const result = await reader.read({
      outputDirectory,
      filePaths: [filePath],
    });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "ENGINE_FILE_OUTSIDE_OUTPUT_DIRECTORY",
        message: "The engine can only read files inside the output directory.",
        context: {
          outputDirectory,
          filePath,
        },
      });
    }
  });
});
