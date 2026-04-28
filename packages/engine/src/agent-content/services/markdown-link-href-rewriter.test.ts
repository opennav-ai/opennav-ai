import { describe, expect, it } from "vitest";
import type { OpenNavPage } from "../../pages/types/opennav-page";
import type { MarkdownLinkHrefRewriteResult } from "../types/markdown-link-href-rewrite-result";
import { MarkdownLinkHrefRewriter } from "./markdown-link-href-rewriter";

function createPage(
  sourceFilePath: OpenNavPage["sourceFilePath"],
  sourceContentType: OpenNavPage["sourceContentType"],
  route: string,
  canonicalUrl: string,
  title: string,
): OpenNavPage {
  return {
    sourceFilePath,
    sourceContentType,
    route,
    canonicalUrl,
    title,
    description: undefined,
  };
}

describe("MarkdownLinkHrefRewriter", (): void => {
  const homePage = createPage(
    "index.html",
    "html",
    "/",
    "https://example.com/",
    "Home",
  );
  const docsIndexPage = createPage(
    "docs/index.html",
    "html",
    "/docs/",
    "https://example.com/docs/",
    "Docs",
  );
  const guidePage = createPage(
    "docs/guides/install.html",
    "html",
    "/docs/guides/install",
    "https://example.com/docs/guides/install",
    "Install",
  );
  const apiPage = createPage(
    "docs/api.html",
    "html",
    "/docs/api",
    "https://example.com/docs/api",
    "API",
  );
  const cliOptionsPage = createPage(
    "docs/cli/options.md",
    "markdown",
    "/docs/cli/options",
    "https://example.com/docs/cli/options",
    "CLI Options",
  );
  const pages: readonly OpenNavPage[] = [
    homePage,
    docsIndexPage,
    guidePage,
    apiPage,
    cliOptionsPage,
  ];

  it("rewrites exact known internal page hrefs to Markdown artifact URLs", (): void => {
    const rewriter = new MarkdownLinkHrefRewriter();

    const results: readonly MarkdownLinkHrefRewriteResult[] = [
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/docs/api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/docs/api.html",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "https://example.com/docs/api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/docs/",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/docs/index.html",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "../api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/docs/api#auth",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/index.html",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/docs/cli/options",
      }),
    ];

    expect(results).toEqual([
      { href: "https://example.com/docs/api.md" },
      { href: "https://example.com/docs/api.md" },
      { href: "https://example.com/docs/api.md" },
      { href: "https://example.com/docs/index.md" },
      { href: "https://example.com/docs/index.md" },
      { href: "https://example.com/docs/api.md" },
      { href: "https://example.com/docs/api.md#auth" },
      { href: "https://example.com/index.md" },
      { href: "https://example.com/index.md" },
      { href: "https://example.com/docs/cli/options.md" },
    ]);
  });

  it("preserves unsupported, external, unknown, and query-bearing hrefs exactly", (): void => {
    const rewriter = new MarkdownLinkHrefRewriter();

    const results: readonly MarkdownLinkHrefRewriteResult[] = [
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "mailto:hello@example.com",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "tel:+15555550123",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/assets/logo.png",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "../assets/logo.png",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "#install",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/docs/missing",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "/docs/api?tab=auth",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "docs/api?tab=auth",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "http://[invalid",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "",
      }),
    ];

    expect(results).toEqual([
      { href: "mailto:hello@example.com" },
      { href: "tel:+15555550123" },
      { href: "/assets/logo.png" },
      { href: "../assets/logo.png" },
      { href: "#install" },
      { href: "/docs/missing" },
      { href: "/docs/api?tab=auth" },
      { href: "docs/api?tab=auth" },
      { href: "http://[invalid" },
      { href: "" },
    ]);
  });

  it("preserves absolute links to other domains and origins exactly", (): void => {
    const rewriter = new MarkdownLinkHrefRewriter();

    const results: readonly MarkdownLinkHrefRewriteResult[] = [
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "https://anotherdomain.com/docs/api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "https://docs.anotherdomain.com/docs/api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "https://anotherdomain.org/docs/api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "http://example.com/docs/api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com",
        currentPage: guidePage,
        pages,
        href: "//anotherdomain.com/docs/api",
      }),
    ];

    expect(results).toEqual([
      { href: "https://anotherdomain.com/docs/api" },
      { href: "https://docs.anotherdomain.com/docs/api" },
      { href: "https://anotherdomain.org/docs/api" },
      { href: "http://example.com/docs/api" },
      { href: "//anotherdomain.com/docs/api" },
    ]);
  });

  it("rewrites only links that resolve inside a configured base URL path", (): void => {
    const prefixedApiPage = createPage(
      "docs/api.html",
      "html",
      "/docs/api",
      "https://example.com/base/docs/api",
      "API",
    );
    const prefixedGuidePage = createPage(
      "docs/guides/install.html",
      "html",
      "/docs/guides/install",
      "https://example.com/base/docs/guides/install",
      "Install",
    );
    const prefixedPages: readonly OpenNavPage[] = [
      prefixedGuidePage,
      prefixedApiPage,
    ];
    const rewriter = new MarkdownLinkHrefRewriter();

    const results: readonly MarkdownLinkHrefRewriteResult[] = [
      rewriter.rewrite({
        baseUrl: "https://example.com/base/",
        currentPage: prefixedGuidePage,
        pages: prefixedPages,
        href: "/base/docs/api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com/base/",
        currentPage: prefixedGuidePage,
        pages: prefixedPages,
        href: "https://example.com/base/docs/api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com/base/",
        currentPage: prefixedGuidePage,
        pages: prefixedPages,
        href: "../api",
      }),
      rewriter.rewrite({
        baseUrl: "https://example.com/base/",
        currentPage: prefixedGuidePage,
        pages: prefixedPages,
        href: "/docs/api",
      }),
    ];

    expect(results).toEqual([
      { href: "https://example.com/base/docs/api.md" },
      { href: "https://example.com/base/docs/api.md" },
      { href: "https://example.com/base/docs/api.md" },
      { href: "/docs/api" },
    ]);
  });
});
