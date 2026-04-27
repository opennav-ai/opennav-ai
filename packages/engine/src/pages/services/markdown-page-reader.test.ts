import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPage } from "../types/opennav-page";
import { MarkdownPageReader } from "./markdown-page-reader";

describe("MarkdownPageReader", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("returns exact metadata-only page data for a Markdown file", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-markdown-page-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "docs/api.md";
    const content = "# API\n\nUse the OpenNav AI engine.\n\nMore details.";
    await mkdir(join(outputDirectory, "docs"), { recursive: true });
    await writeFile(join(outputDirectory, filePath), content, "utf8");

    const reader = new MarkdownPageReader();
    const result: Result<OpenNavPage, OpenNavError> = await reader.read({
      baseUrl: "https://example.com",
      outputDirectory,
      fileReference: {
        filePath,
        kind: "markdown",
      },
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        sourceFilePath: filePath,
        sourceContentType: "markdown",
        route: "/docs/api",
        canonicalUrl: "https://example.com/docs/api",
        title: "API",
        description: "Use the OpenNav AI engine.",
      });
    }
  });

  it("uses the first top-level Markdown heading as the title", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-markdown-page-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "guide/index.md";
    const content = "Intro paragraph.\n\n# Guide\n\nSecond paragraph.";
    await mkdir(join(outputDirectory, "guide"), { recursive: true });
    await writeFile(join(outputDirectory, filePath), content, "utf8");

    const reader = new MarkdownPageReader();
    const result: Result<OpenNavPage, OpenNavError> = await reader.read({
      baseUrl: "https://example.com/docs/",
      outputDirectory,
      fileReference: {
        filePath,
        kind: "markdown",
      },
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        sourceFilePath: filePath,
        sourceContentType: "markdown",
        route: "/guide/",
        canonicalUrl: "https://example.com/docs/guide/",
        title: "Guide",
        description: "Intro paragraph.",
      });
    }
  });
});
