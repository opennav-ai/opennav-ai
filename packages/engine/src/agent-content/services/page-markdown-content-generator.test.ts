import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { PageMarkdownContentGenerateResult } from "../types/page-markdown-content-generate-result";
import { PageMarkdownContentGenerator } from "./page-markdown-content-generator";

describe("PageMarkdownContentGenerator", (): void => {
  it("returns exact Markdown content for a Markdown source page", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const sourceContent = [
      "# CLI Options",
      "",
      "Configure OpenNav AI from the command line.",
      "",
      "- `--dry-run` previews generated files.",
      "- `--full-run` enables bulk operations.",
      "",
    ].join("\n");

    const result: Result<PageMarkdownContentGenerateResult, OpenNavError> =
      generator.generate({
        page: {
          sourceFilePath: "docs/cli/options.md",
          sourceContentType: "markdown",
          route: "/docs/cli/options",
          canonicalUrl: "https://example.com/docs/cli/options",
          title: "CLI Options",
          description: "Configure OpenNav AI from the command line.",
        },
        sourceContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        content: sourceContent,
      });
    }
  });

  it("converts HTML headings, paragraphs, and links into exact Markdown content", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const sourceContent = [
      "<!doctype html>",
      "<html>",
      "<head><title>Home</title></head>",
      "<body>",
      "<h1>Home</h1>",
      '<p>OpenNav AI creates <a href="https://example.com/docs">agent-readable files</a>.</p>',
      "<h2>Install</h2>",
      "<p>Run the CLI after your static site is built.</p>",
      "</body>",
      "</html>",
    ].join("");

    const result: Result<PageMarkdownContentGenerateResult, OpenNavError> =
      generator.generate({
        page: {
          sourceFilePath: "index.html",
          sourceContentType: "html",
          route: "/",
          canonicalUrl: "https://example.com/",
          title: "Home",
          description: "OpenNav AI creates agent-readable files.",
        },
        sourceContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        content:
          "# Home\n\nOpenNav AI creates [agent-readable files](https://example.com/docs).\n\n## Install\n\nRun the CLI after your static site is built.\n",
      });
    }
  });

  it("converts HTML lists and code blocks into exact Markdown content", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const sourceContent = [
      "<html>",
      "<body>",
      "<h1>CLI</h1>",
      "<ul>",
      "<li>Run <code>opennav</code>.</li>",
      "<li>Review generated files.</li>",
      "</ul>",
      "<ol>",
      "<li>Build the site.</li>",
      "<li>Run OpenNav.</li>",
      "</ol>",
      "<pre><code>npm run build\nopennav --dry-run</code></pre>",
      "</body>",
      "</html>",
    ].join("");

    const result: Result<PageMarkdownContentGenerateResult, OpenNavError> =
      generator.generate({
        page: {
          sourceFilePath: "docs/cli.html",
          sourceContentType: "html",
          route: "/docs/cli",
          canonicalUrl: "https://example.com/docs/cli",
          title: "CLI",
          description: "Run OpenNav from the command line.",
        },
        sourceContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        content:
          "# CLI\n\n- Run `opennav`.\n- Review generated files.\n\n1. Build the site.\n2. Run OpenNav.\n\n```txt\nnpm run build\nopennav --dry-run\n```\n",
      });
    }
  });
});
