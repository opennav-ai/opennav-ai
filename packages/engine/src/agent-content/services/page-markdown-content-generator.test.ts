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

  it("converts HTML code block language hints into exact fenced Markdown content", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const page = {
      sourceFilePath: "docs/code.html",
      sourceContentType: "html",
      route: "/docs/code",
      canonicalUrl: "https://example.com/docs/code",
      title: "Code",
      description: "Review code examples.",
    } as const;
    const sourceContent = [
      "<html>",
      "<body>",
      "<h1>Code</h1>",
      '<pre><code class="language-ts">const result = await Engine.execute(input);</code></pre>',
      '<pre><code class="lang-bash">npm run build</code></pre>',
      '<pre><code data-language="tsx">export const App = () =&gt; null;</code></pre>',
      '<pre><code data-lang="sh">echo done</code></pre>',
      "<pre><code>plain text</code></pre>",
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
          "# Code\n\n```ts\nconst result = await Engine.execute(input);\n```\n\n```bash\nnpm run build\n```\n\n```tsx\nexport const App = () => null;\n```\n\n```sh\necho done\n```\n\n```txt\nplain text\n```\n",
      });
    }
  });

  it("converts common HTML elements into exact Markdown content", (): void => {
    const generator = new PageMarkdownContentGenerator();
    const page = {
      sourceFilePath: "docs/formatting.html",
      sourceContentType: "html",
      route: "/docs/formatting",
      canonicalUrl: "https://example.com/docs/formatting",
      title: "Formatting",
      description: "Inspect common HTML formatting.",
    } as const;
    const sourceContent = [
      "<html>",
      "<body>",
      "<h1>Formatting</h1>",
      "<p>Use <strong>strong text</strong>, <em>em text</em>, and <del>deleted text</del>.</p>",
      "<blockquote><p>Agents need readable docs.</p></blockquote>",
      "<hr>",
      "<ul>",
      "<li>Generate files<ul><li>Run unit tests</li><li>Run integration tests</li></ul></li>",
      "<li>Review output</li>",
      "</ul>",
      "<table>",
      "<thead><tr><th>Name</th><th>Output</th></tr></thead>",
      "<tbody>",
      "<tr><td>Home</td><td>index.md</td></tr>",
      "<tr><td>API</td><td>docs/api.md</td></tr>",
      "</tbody>",
      "</table>",
      '<p><img src="/assets/logo.svg" alt="Fixture Logo"></p>',
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
          "# Formatting\n\nUse **strong text**, *em text*, and ~~deleted text~~.\n\n> Agents need readable docs.\n\n---\n\n- Generate files\n  - Run unit tests\n  - Run integration tests\n- Review output\n\n| Name | Output |\n| --- | --- |\n| Home | index.md |\n| API | docs/api.md |\n\n![Fixture Logo](/assets/logo.svg)\n",
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
