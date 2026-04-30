import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFile } from "../../input/types/engine-file";
import type { OpenNavPageMetadata } from "../types/opennav-page";
import { MarkdownPageReader } from "./markdown-page-reader";

describe("MarkdownPageReader", (): void => {
  it("returns exact metadata-only page data for an already-read Markdown file", async (): Promise<void> => {
    const filePath = "docs/api.md";
    const content = "# API\n\nUse the OpenNav AI engine.\n\nMore details.";
    const file: EngineFile = {
      filePath,
      kind: "markdown",
      content,
    };

    const reader = new MarkdownPageReader();
    const result: Result<OpenNavPageMetadata, OpenNavError> = await reader.read(
      {
        baseUrl: "https://example.com",
        file,
      },
    );

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
    const filePath = "guide/index.md";
    const content = "Intro paragraph.\n\n# Guide\n\nSecond paragraph.";
    const file: EngineFile = {
      filePath,
      kind: "markdown",
      content,
    };

    const reader = new MarkdownPageReader();
    const result: Result<OpenNavPageMetadata, OpenNavError> = await reader.read(
      {
        baseUrl: "https://example.com/docs/",
        file,
      },
    );

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
