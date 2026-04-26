import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EngineFileReader } from "./engine-file-reader";

describe("EngineFileReader", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("reads exact content for an HTML file", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-file-reader-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = join(outputDirectory, "index.html");
    const content = "<html><head><title>Home</title></head></html>";
    await mkdir(outputDirectory);
    await writeFile(filePath, content, "utf8");

    const reader = new EngineFileReader();
    const result = await reader.read({
      outputDirectory,
      filePath,
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        filePath,
        kind: "html",
        content,
      });
    }
  });

  it("returns an exact typed error for a path outside the output directory", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-file-reader-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = join(fixtureDirectory, "secrets.html");
    await mkdir(outputDirectory);
    await writeFile(filePath, "<html>Private</html>", "utf8");

    const reader = new EngineFileReader();
    const result = await reader.read({
      outputDirectory,
      filePath,
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
