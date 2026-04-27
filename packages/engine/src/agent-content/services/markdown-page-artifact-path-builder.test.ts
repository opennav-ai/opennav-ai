import { describe, expect, it } from "vitest";
import type { MarkdownPageArtifactPathBuildResult } from "../types/markdown-page-artifact-path-build-result";
import { MarkdownPageArtifactPathBuilder } from "./markdown-page-artifact-path-builder";

describe("MarkdownPageArtifactPathBuilder", (): void => {
  it("builds exact Markdown artifact path and URL for the root page", (): void => {
    const builder = new MarkdownPageArtifactPathBuilder();

    const result: MarkdownPageArtifactPathBuildResult = builder.build({
      baseUrl: "https://example.com",
      page: {
        sourceFilePath: "index.html",
        sourceContentType: "html",
        route: "/",
        canonicalUrl: "https://example.com/",
        title: "Home",
        description: "Project overview and entry point.",
      },
    });

    expect(result).toEqual({
      outputFilePath: "index.md",
      publicUrl: "https://example.com/index.md",
    });
  });

  it("builds exact Markdown artifact path and URL for a nested index page", (): void => {
    const builder = new MarkdownPageArtifactPathBuilder();

    const result: MarkdownPageArtifactPathBuildResult = builder.build({
      baseUrl: "https://example.com",
      page: {
        sourceFilePath: "docs/index.html",
        sourceContentType: "html",
        route: "/docs/",
        canonicalUrl: "https://example.com/docs/",
        title: "Docs",
        description: undefined,
      },
    });

    expect(result).toEqual({
      outputFilePath: "docs/index.md",
      publicUrl: "https://example.com/docs/index.md",
    });
  });

  it("builds exact Markdown artifact path and URL for a nested HTML page", (): void => {
    const builder = new MarkdownPageArtifactPathBuilder();

    const result: MarkdownPageArtifactPathBuildResult = builder.build({
      baseUrl: "https://example.com/docs/",
      page: {
        sourceFilePath: "reference/api.html",
        sourceContentType: "html",
        route: "/reference/api",
        canonicalUrl: "https://example.com/docs/reference/api",
        title: "API Reference",
        description: undefined,
      },
    });

    expect(result).toEqual({
      outputFilePath: "reference/api.md",
      publicUrl: "https://example.com/docs/reference/api.md",
    });
  });

  it("keeps existing Markdown page paths as Markdown artifact URLs", (): void => {
    const builder = new MarkdownPageArtifactPathBuilder();

    const result: MarkdownPageArtifactPathBuildResult = builder.build({
      baseUrl: "https://example.com/docs/",
      page: {
        sourceFilePath: "reference/cli/options.md",
        sourceContentType: "markdown",
        route: "/reference/cli/options",
        canonicalUrl: "https://example.com/docs/reference/cli/options",
        title: "CLI Options",
        description: undefined,
      },
    });

    expect(result).toEqual({
      outputFilePath: "reference/cli/options.md",
      publicUrl: "https://example.com/docs/reference/cli/options.md",
    });
  });
});
