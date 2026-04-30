import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFile } from "../../input/types/engine-file";
import type { FileMetadataReadResult } from "../types/file-metadata-read-result";
import { FileMetadataReader } from "./file-metadata-reader";

describe("FileMetadataReader", (): void => {
  it("returns exact page data for HTML and Markdown files", async (): Promise<void> => {
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
    const files: readonly EngineFile[] = [
      {
        filePath: htmlFilePath,
        kind: "html",
        content: htmlContent,
      },
      {
        filePath: markdownFilePath,
        kind: "markdown",
        content: markdownContent,
      },
    ];

    const reader = new FileMetadataReader();
    const result: Result<FileMetadataReadResult, OpenNavError> =
      await reader.read({
        baseUrl: "https://example.com",
        files,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        pageMetadata: [
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
      });
    }
  });

  it("ignores files that cannot produce page metadata", async (): Promise<void> => {
    const htmlFilePath = "docs/index.html";
    const robotsFilePath = "robots.txt";
    const htmlContent = "<html><head><title>Docs</title></head></html>";
    const files: readonly EngineFile[] = [
      {
        filePath: htmlFilePath,
        kind: "html",
        content: htmlContent,
      },
      {
        filePath: robotsFilePath,
        kind: "robots",
        content: "User-agent: *\nAllow: /",
      },
    ];

    const reader = new FileMetadataReader();
    const result: Result<FileMetadataReadResult, OpenNavError> =
      await reader.read({
        baseUrl: "https://example.com/base/",
        files,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        pageMetadata: [
          {
            sourceFilePath: htmlFilePath,
            sourceContentType: "html",
            route: "/docs/",
            canonicalUrl: "https://example.com/base/docs/",
            title: "Docs",
            description: undefined,
          },
        ],
      });
    }
  });
});
