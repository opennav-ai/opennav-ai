import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { PageMarkdownContentGenerateResult } from "../types/page-markdown-content-generate-result";
import { PageMarkdownContentGenerator } from "./page-markdown-content-generator";

describe("PageMarkdownContentGenerator", (): void => {
  it("returns exact Markdown content for a Markdown source page", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const page = {
      sourceFilePath: "docs/cli/options.md",
      sourceContentType: "markdown",
      route: "/docs/cli/options",
      canonicalUrl: "https://example.com/docs/cli/options",
      title: "CLI Options",
      description: "Configure OpenNav AI from the command line.",
    } as const;
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
        baseUrl: "https://example.com",
        page,
        pages: [page],
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
    const page = {
      sourceFilePath: "index.html",
      sourceContentType: "html",
      route: "/",
      canonicalUrl: "https://example.com/",
      title: "Home",
      description: "OpenNav AI creates agent-readable files.",
    } as const;
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
        baseUrl: "https://example.com",
        page,
        pages: [page],
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

  it("rewrites known internal HTML links to Markdown artifact URLs", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const currentPage = {
      sourceFilePath: "docs/guide.html",
      sourceContentType: "html",
      route: "/docs/guide",
      canonicalUrl: "https://example.com/docs/guide",
      title: "Guide",
      description: "Read the guide.",
    } as const;
    const apiPage = {
      sourceFilePath: "docs/api.html",
      sourceContentType: "html",
      route: "/docs/api",
      canonicalUrl: "https://example.com/docs/api",
      title: "API",
      description: "Use the API.",
    } as const;
    const sourceContent = [
      "<!doctype html>",
      "<html>",
      "<body>",
      "<h1>Guide</h1>",
      '<p>Read the <a href="/docs/api">API</a> and <a href="https://anotherdomain.com/docs/api">external API</a>.</p>',
      '<p>Keep <a href="#install">local anchors</a> and <a href="/docs/api?tab=auth">query links</a>.</p>',
      "</body>",
      "</html>",
    ].join("");

    const result: Result<PageMarkdownContentGenerateResult, OpenNavError> =
      generator.generate({
        baseUrl: "https://example.com",
        page: currentPage,
        pages: [currentPage, apiPage],
        sourceContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        content:
          "# Guide\n\nRead the [API](https://example.com/docs/api.md) and [external API](https://anotherdomain.com/docs/api).\n\nKeep [local anchors](#install) and [query links](/docs/api?tab=auth).\n",
      });
    }
  });

  it("rewrites absolute same-site HTML links to Markdown artifact URLs", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const currentPage = {
      sourceFilePath: "docs/guide.html",
      sourceContentType: "html",
      route: "/docs/guide",
      canonicalUrl: "https://example.com/docs/guide",
      title: "Guide",
      description: "Read the guide.",
    } as const;
    const apiPage = {
      sourceFilePath: "docs/api.html",
      sourceContentType: "html",
      route: "/docs/api",
      canonicalUrl: "https://example.com/docs/api",
      title: "API",
      description: "Use the API.",
    } as const;
    const sourceContent = [
      "<!doctype html>",
      "<html>",
      "<body>",
      "<h1>Guide</h1>",
      '<p>Read the <a href="https://example.com/docs/api">full URL API page</a>.</p>',
      "</body>",
      "</html>",
    ].join("");

    const result: Result<PageMarkdownContentGenerateResult, OpenNavError> =
      generator.generate({
        baseUrl: "https://example.com",
        page: currentPage,
        pages: [currentPage, apiPage],
        sourceContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        content:
          "# Guide\n\nRead the [full URL API page](https://example.com/docs/api.md).\n",
      });
    }
  });

  it("rewrites standalone HTML link blocks to Markdown artifact URLs", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const homePage = {
      sourceFilePath: "index.html",
      sourceContentType: "html",
      route: "/",
      canonicalUrl: "https://example.com/",
      title: "Home",
      description: "Start here.",
    } as const;
    const docsPage = {
      sourceFilePath: "docs/index.html",
      sourceContentType: "html",
      route: "/docs/",
      canonicalUrl: "https://example.com/docs/",
      title: "Docs",
      description: "Read the docs.",
    } as const;
    const sourceContent = [
      "<!doctype html>",
      "<html>",
      "<body>",
      "<h1>Home</h1>",
      '<a href="/docs/">Docs</a>',
      '<a href="https://anotherdomain.com/docs/">External Docs</a>',
      "</body>",
      "</html>",
    ].join("");

    const result: Result<PageMarkdownContentGenerateResult, OpenNavError> =
      generator.generate({
        baseUrl: "https://example.com",
        page: homePage,
        pages: [homePage, docsPage],
        sourceContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        content:
          "# Home\n\n[Docs](https://example.com/docs/index.md)\n\n[External Docs](https://anotherdomain.com/docs/)\n",
      });
    }
  });

  it("rewrites and preserves additional HTML link shapes through the site page map", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const currentPage = {
      sourceFilePath: "docs/guides/install.html",
      sourceContentType: "html",
      route: "/docs/guides/install",
      canonicalUrl: "https://example.com/docs/guides/install",
      title: "Install",
      description: "Install the package.",
    } as const;
    const docsIndexPage = {
      sourceFilePath: "docs/index.html",
      sourceContentType: "html",
      route: "/docs/",
      canonicalUrl: "https://example.com/docs/",
      title: "Docs",
      description: "Read the docs.",
    } as const;
    const apiPage = {
      sourceFilePath: "docs/api.html",
      sourceContentType: "html",
      route: "/docs/api",
      canonicalUrl: "https://example.com/docs/api",
      title: "API",
      description: "Use the API.",
    } as const;
    const sourceContent = [
      "<!doctype html>",
      "<html>",
      "<body>",
      "<h1>Install</h1>",
      '<p>Start at <a href="/docs/">Docs</a>, then read <a href="../api">API</a> and <a href="/docs/api#auth">Auth</a>.</p>',
      '<p>Email <a href="mailto:hello@example.com">support</a>, inspect <a href="/assets/logo.png">the logo</a>, or keep <a href="/docs/missing">unknown pages</a>.</p>',
      "</body>",
      "</html>",
    ].join("");

    const result: Result<PageMarkdownContentGenerateResult, OpenNavError> =
      generator.generate({
        baseUrl: "https://example.com",
        page: currentPage,
        pages: [currentPage, docsIndexPage, apiPage],
        sourceContent,
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        content:
          "# Install\n\nStart at [Docs](https://example.com/docs/index.md), then read [API](https://example.com/docs/api.md) and [Auth](https://example.com/docs/api.md#auth).\n\nEmail [support](mailto:hello@example.com), inspect [the logo](/assets/logo.png), or keep [unknown pages](/docs/missing).\n",
      });
    }
  });

  it("converts HTML lists and code blocks into exact Markdown content", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const page = {
      sourceFilePath: "docs/cli.html",
      sourceContentType: "html",
      route: "/docs/cli",
      canonicalUrl: "https://example.com/docs/cli",
      title: "CLI",
      description: "Run OpenNav from the command line.",
    } as const;
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
        baseUrl: "https://example.com",
        page,
        pages: [page],
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
