import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { PageListReadResult } from "../types/page-list-read-result";
import { PageListReader } from "./page-list-reader";

describe("PageListReader", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("returns exact page data for HTML and Markdown references", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-page-list-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const htmlFilePath = "index.html";
    const markdownFilePath = "docs/api.md";
    const htmlContent = [
      "<html>",
      "<head>",
      "<title>Home</title>",
      '<meta name="description" content="Welcome to OpenNav AI.">',
      "</head>",
      "<body><h1>Docs Home</h1></body>",
      "</html>",
    ].join("");
    const markdownContent = "# API\n\nUse the OpenNav AI engine.";
    await mkdir(join(outputDirectory, "docs"), { recursive: true });
    await writeFile(join(outputDirectory, htmlFilePath), htmlContent, "utf8");
    await writeFile(
      join(outputDirectory, markdownFilePath),
      markdownContent,
      "utf8",
    );

    const reader = new PageListReader();
    const result: Result<PageListReadResult, OpenNavError> = await reader.read({
      baseUrl: "https://example.com",
      outputDirectory,
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
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        pages: [
          {
            sourceFilePath: htmlFilePath,
            sourceContentType: "html",
            route: "/",
            canonicalUrl: "https://example.com/",
            title: "Home",
            description: "Welcome to OpenNav AI.",
          },
          {
            sourceFilePath: markdownFilePath,
            sourceContentType: "markdown",
            route: "/docs/api",
            canonicalUrl: "https://example.com/docs/api",
            title: "API",
            description: "Use the OpenNav AI engine.",
          },
        ],
        skippedFilePaths: [],
      });
    }
  });

  it("skips exact non-page file references", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-page-list-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const htmlFilePath = "docs/index.html";
    const robotsFilePath = "robots.txt";
    const htmlContent = "<html><head><title>Docs</title></head></html>";
    await mkdir(join(outputDirectory, "docs"), { recursive: true });
    await writeFile(join(outputDirectory, htmlFilePath), htmlContent, "utf8");

    const reader = new PageListReader();
    const result: Result<PageListReadResult, OpenNavError> = await reader.read({
      baseUrl: "https://example.com/base/",
      outputDirectory,
      fileReferences: [
        {
          filePath: htmlFilePath,
          kind: "html",
        },
        {
          filePath: robotsFilePath,
          kind: "robots",
        },
      ],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        pages: [
          {
            sourceFilePath: htmlFilePath,
            sourceContentType: "html",
            route: "/docs/",
            canonicalUrl: "https://example.com/base/docs/",
            title: "Docs",
            description: undefined,
          },
        ],
        skippedFilePaths: [robotsFilePath],
      });
    }
  });

  it("returns the first typed page reader error", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-page-list-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "missing.html";
    const absoluteFilePath = join(outputDirectory, filePath);
    await mkdir(outputDirectory);

    const reader = new PageListReader();
    const result: Result<PageListReadResult, OpenNavError> = await reader.read({
      baseUrl: "https://example.com",
      outputDirectory,
      fileReferences: [
        {
          filePath,
          kind: "html",
        },
      ],
    });

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
