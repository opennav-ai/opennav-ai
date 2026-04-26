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

  it("returns an exact warning for an unsupported file type and continues reading supported files", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-file-list-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const htmlFilePath = "index.html";
    const unsupportedFilePath = "image.png";
    const htmlContent = "<html><head><title>Home</title></head></html>";
    await mkdir(outputDirectory);
    await writeFile(join(outputDirectory, htmlFilePath), htmlContent, "utf8");
    await writeFile(join(outputDirectory, unsupportedFilePath), "PNG", "utf8");

    const reader = new EngineFileListReader();
    const result = await reader.read({
      outputDirectory,
      filePaths: [htmlFilePath, unsupportedFilePath],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        files: [
          {
            filePath: htmlFilePath,
            kind: "html",
            content: htmlContent,
          },
        ],
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
});
