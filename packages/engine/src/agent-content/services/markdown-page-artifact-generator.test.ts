import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { MarkdownPageArtifactGenerateResult } from "../types/markdown-page-artifact-generate-result";
import { MarkdownPageArtifactGenerator } from "./markdown-page-artifact-generator";

describe("MarkdownPageArtifactGenerator", (): void => {
  it("generates an exact Markdown artifact for a Markdown source page", (): void => {
    const generator = new MarkdownPageArtifactGenerator();
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
        page: {
          sourceFilePath: "reference/cli/options.md",
          sourceContentType: "markdown",
          route: "/reference/cli/options",
          canonicalUrl: "https://example.com/docs/reference/cli/options",
          title: "CLI Options",
          description: "Configure OpenNav AI from the command line.",
        },
        sourceContent,
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
        page: {
          sourceFilePath: "reference/api.html",
          sourceContentType: "html",
          route: "/reference/api",
          canonicalUrl: "https://example.com/docs/reference/api",
          title: "API Reference",
          description: "Use the SDK from TypeScript.",
        },
        sourceContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: "reference/api.md",
        publicUrl: "https://example.com/docs/reference/api.md",
        content:
          "# API Reference\n\nUse the [SDK](https://example.com/docs/sdk) from TypeScript.\n\n## Install\n\n```txt\nnpm install @opennav-ai/engine\n```\n",
      });
    }
  });
});
