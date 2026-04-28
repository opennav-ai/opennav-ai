import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { MarkdownPageArtifactGenerateResult } from "../types/markdown-page-artifact-generate-result";
import { MarkdownPageArtifactGenerator } from "./markdown-page-artifact-generator";

describe("MarkdownPageArtifactGenerator", (): void => {
  it("generates an exact Markdown artifact for a Markdown source page", (): void => {
    const generator = new MarkdownPageArtifactGenerator();
    const page = {
      sourceFilePath: "reference/cli/options.md",
      sourceContentType: "markdown",
      route: "/reference/cli/options",
      canonicalUrl: "https://example.com/docs/reference/cli/options",
      title: "CLI Options",
      description: "Configure OpenNav AI from the command line.",
    } as const;
    const sourceContent = [
      "# CLI Options",
      "",
      "Configure OpenNav AI from the command line.",
      "",
      "- `--dry-run` previews generated files.",
      "",
    ].join("\n");

    const result: Result<MarkdownPageArtifactGenerateResult, OpenNavError> =
      generator.generate({
        baseUrl: "https://example.com/docs",
        page,
        pages: [page],
        sourceContent,
        includeSiteIndexBacklink: true,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: "reference/cli/options.md",
        publicUrl: "https://example.com/docs/reference/cli/options.md",
        content: sourceContent,
      });
    }
  });

  it("generates an exact Markdown artifact for an HTML source page", (): void => {
    const generator = new MarkdownPageArtifactGenerator();
    const page = {
      sourceFilePath: "reference/api.html",
      sourceContentType: "html",
      route: "/reference/api",
      canonicalUrl: "https://example.com/docs/reference/api",
      title: "API Reference",
      description: "Use the SDK from TypeScript.",
    } as const;
    const sourceContent = [
      "<!doctype html>",
      "<html>",
      "<body>",
      "<h1>API Reference</h1>",
      '<p>Use the <a href="https://example.com/docs/sdk">SDK</a> from TypeScript.</p>',
      "<h2>Install</h2>",
      "<pre><code>npm install @opennav-ai/engine</code></pre>",
      "</body>",
      "</html>",
    ].join("");

    const result: Result<MarkdownPageArtifactGenerateResult, OpenNavError> =
      generator.generate({
        baseUrl: "https://example.com/docs/",
        page,
        pages: [page],
        sourceContent,
        includeSiteIndexBacklink: true,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: "reference/api.md",
        publicUrl: "https://example.com/docs/reference/api.md",
        content:
          "# API Reference\n\nUse the [SDK](https://example.com/docs/sdk) from TypeScript.\n\n## Install\n\n```txt\nnpm install @opennav-ai/engine\n```\n\n---\n\nSite index: [llms.txt](https://example.com/docs/llms.txt)\n",
      });
    }
  });

  it("rewrites known internal links inside an HTML source artifact", (): void => {
    const generator = new MarkdownPageArtifactGenerator();
    const apiPage = {
      sourceFilePath: "reference/api.html",
      sourceContentType: "html",
      route: "/reference/api",
      canonicalUrl: "https://example.com/docs/reference/api",
      title: "API Reference",
      description: "Use the API from TypeScript.",
    } as const;
    const sdkPage = {
      sourceFilePath: "reference/sdk.html",
      sourceContentType: "html",
      route: "/reference/sdk",
      canonicalUrl: "https://example.com/docs/reference/sdk",
      title: "SDK",
      description: "Use the SDK from TypeScript.",
    } as const;
    const sourceContent = [
      "<!doctype html>",
      "<html>",
      "<body>",
      "<h1>API Reference</h1>",
      '<p>Use the <a href="/docs/reference/sdk">SDK</a> from TypeScript.</p>',
      "</body>",
      "</html>",
    ].join("");

    const result: Result<MarkdownPageArtifactGenerateResult, OpenNavError> =
      generator.generate({
        baseUrl: "https://example.com/docs/",
        page: apiPage,
        pages: [apiPage, sdkPage],
        sourceContent,
        includeSiteIndexBacklink: true,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: "reference/api.md",
        publicUrl: "https://example.com/docs/reference/api.md",
        content:
          "# API Reference\n\nUse the [SDK](https://example.com/docs/reference/sdk.md) from TypeScript.\n\n---\n\nSite index: [llms.txt](https://example.com/docs/llms.txt)\n",
      });
    }
  });

  it("omits the root llms.txt backlink when generated content is used outside a Markdown artifact file", (): void => {
    const generator = new MarkdownPageArtifactGenerator();
    const page = {
      sourceFilePath: "reference/api.html",
      sourceContentType: "html",
      route: "/reference/api",
      canonicalUrl: "https://example.com/docs/reference/api",
      title: "API Reference",
      description: "Use the SDK from TypeScript.",
    } as const;
    const sourceContent = [
      "<!doctype html>",
      "<html>",
      "<body>",
      "<h1>API Reference</h1>",
      "<p>Use the SDK from TypeScript.</p>",
      "</body>",
      "</html>",
    ].join("");

    const result: Result<MarkdownPageArtifactGenerateResult, OpenNavError> =
      generator.generate({
        baseUrl: "https://example.com/docs/",
        page,
        pages: [page],
        sourceContent,
        includeSiteIndexBacklink: false,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: "reference/api.md",
        publicUrl: "https://example.com/docs/reference/api.md",
        content: "# API Reference\n\nUse the SDK from TypeScript.\n",
      });
    }
  });
});
