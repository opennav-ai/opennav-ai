import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFile } from "../../input/types/engine-file";
import type { OpenNavPageMetadata } from "../types/opennav-page";
import { HtmlPageReader } from "./html-page-reader";

describe("HtmlPageReader", (): void => {
  it("returns exact metadata-only page data for an already-read HTML file", async (): Promise<void> => {
    const filePath = "index.html";
    const content = [
      "<!doctype html>",
      "<html>",
      "<head>",
      "<title>Home</title>",
      '<meta name="description" content="Welcome to OpenNav AI.">',
      "</head>",
      "<body><h1>Docs Home</h1></body>",
      "</html>",
    ].join("");
    const file: EngineFile = {
      filePath,
      kind: "html",
      content,
    };

    const reader = new HtmlPageReader();
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
        sourceContentType: "html",
        route: "/",
        canonicalUrl: "https://example.com/",
        title: "Home",
        description: "Welcome to OpenNav AI.",
      });
    }
  });

  it("returns exact metadata-only page data for a nested HTML index file", async (): Promise<void> => {
    const filePath = "docs/getting-started/index.html";
    const content = [
      "<html>",
      "<head>",
      "<title>Getting Started</title>",
      '<meta content="Install the package." name="description">',
      "</head>",
      "<body></body>",
      "</html>",
    ].join("");
    const file: EngineFile = {
      filePath,
      kind: "html",
      content,
    };

    const reader = new HtmlPageReader();
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
        sourceContentType: "html",
        route: "/docs/getting-started/",
        canonicalUrl: "https://example.com/docs/getting-started/",
        title: "Getting Started",
        description: "Install the package.",
      });
    }
  });

  it("uses the HTML title before the first h1 when both exist", async (): Promise<void> => {
    const filePath = "reference.html";
    const content = [
      "<html>",
      "<head><title>API Reference</title></head>",
      "<body><h1>Reference Heading</h1></body>",
      "</html>",
    ].join("");
    const file: EngineFile = {
      filePath,
      kind: "html",
      content,
    };

    const reader = new HtmlPageReader();
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
        sourceContentType: "html",
        route: "/reference",
        canonicalUrl: "https://example.com/reference",
        title: "API Reference",
        description: undefined,
      });
    }
  });

  it("uses the first h1 as the title when the HTML title is missing", async (): Promise<void> => {
    const filePath = "reference.html";
    const content = "<html><body><h1>Reference Heading</h1></body></html>";
    const file: EngineFile = {
      filePath,
      kind: "html",
      content,
    };

    const reader = new HtmlPageReader();
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
        sourceContentType: "html",
        route: "/reference",
        canonicalUrl: "https://example.com/reference",
        title: "Reference Heading",
        description: undefined,
      });
    }
  });
});
