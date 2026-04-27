import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { IndexMdFallbackGenerateResult } from "../types/index-md-fallback-generate-result";
import { IndexMdFallbackGenerator } from "./index-md-fallback-generator";

describe("IndexMdFallbackGenerator", (): void => {
  it("generates exact root index.md fallback content when enabled for an HTML root page", (): void => {
    const generator = new IndexMdFallbackGenerator();
    const markdownContent =
      "# Home\n\nOpenNav AI creates files agents can read directly.\n";

    const result: Result<IndexMdFallbackGenerateResult, OpenNavError> =
      generator.generate({
        enabled: true,
        page: {
          sourceFilePath: "index.html",
          sourceContentType: "html",
          route: "/",
          canonicalUrl: "https://example.com/",
          title: "Home",
          description: "OpenNav AI creates files agents can read directly.",
        },
        markdownContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: "index.md",
        content: markdownContent,
        skippedFilePaths: [],
        warnings: [],
      });
    }
  });

  it("generates exact root index.md fallback content when enabled for a Markdown root page", (): void => {
    const generator = new IndexMdFallbackGenerator();
    const markdownContent =
      "# Home\n\nMarkdown sites can publish the same root fallback body.\n";

    const result: Result<IndexMdFallbackGenerateResult, OpenNavError> =
      generator.generate({
        enabled: true,
        page: {
          sourceFilePath: "index.md",
          sourceContentType: "markdown",
          route: "/",
          canonicalUrl: "https://example.com/",
          title: "Home",
          description:
            "Markdown sites can publish the same root fallback body.",
        },
        markdownContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: "index.md",
        content: markdownContent,
        skippedFilePaths: [],
        warnings: [],
      });
    }
  });

  it("generates exact root index.md fallback content when a route root page uses another source path", (): void => {
    const generator = new IndexMdFallbackGenerator();
    const markdownContent =
      "# Home\n\nFramework adapters can expose a root route from another source path.\n";

    const result: Result<IndexMdFallbackGenerateResult, OpenNavError> =
      generator.generate({
        enabled: true,
        page: {
          sourceFilePath: "home.html",
          sourceContentType: "html",
          route: "/",
          canonicalUrl: "https://example.com/",
          title: "Home",
          description:
            "Framework adapters can expose a root route from another source path.",
        },
        markdownContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: "index.md",
        content: markdownContent,
        skippedFilePaths: [],
        warnings: [],
      });
    }
  });

  it("returns no fallback content when disabled", (): void => {
    const generator = new IndexMdFallbackGenerator();

    const result: Result<IndexMdFallbackGenerateResult, OpenNavError> =
      generator.generate({
        enabled: false,
        page: {
          sourceFilePath: "index.html",
          sourceContentType: "html",
          route: "/",
          canonicalUrl: "https://example.com/",
          title: "Home",
          description: "Project overview and entry point.",
        },
        markdownContent: "# Home\n\nProject overview and entry point.\n",
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: undefined,
        content: undefined,
        skippedFilePaths: [],
        warnings: [],
      });
    }
  });
});
