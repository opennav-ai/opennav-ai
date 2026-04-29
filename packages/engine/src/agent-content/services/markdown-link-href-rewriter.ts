import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { MarkdownLinkHrefRewriteInput } from "../types/markdown-link-href-rewrite-input";
import type { MarkdownLinkHrefRewriteResult } from "../types/markdown-link-href-rewrite-result";
import { MarkdownPageArtifactPathBuilder } from "./markdown-page-artifact-path-builder";

/**
 * Rewrites one source link href to a generated Markdown page endpoint when safe.
 */
export class MarkdownLinkHrefRewriter {
  readonly #artifactPathBuilder: MarkdownPageArtifactPathBuilder;

  /**
   * Creates a link rewriter with the default Markdown artifact path policy.
   *
   * @param artifactPathBuilder - Builds public URLs for matched Markdown endpoints.
   */
  public constructor(
    artifactPathBuilder: MarkdownPageArtifactPathBuilder = new MarkdownPageArtifactPathBuilder(),
  ) {
    this.#artifactPathBuilder = artifactPathBuilder;
  }

  /**
   * Rewrites a single href when it resolves to a known page on the current site.
   *
   * @param input - Site context, current page metadata, known pages, and raw href.
   * @returns The href to write into generated Markdown.
   */
  public rewrite(
    input: MarkdownLinkHrefRewriteInput,
  ): MarkdownLinkHrefRewriteResult {
    const matchedPage = this.findMatchedPage(input);

    if (matchedPage === undefined) {
      return {
        href: input.href,
      };
    }

    const artifactPath = this.#artifactPathBuilder.build({
      baseUrl: input.baseUrl,
      page: matchedPage,
    });

    return {
      href: `${artifactPath.publicUrl}${this.extractFragment(input.href)}`,
    };
  }

  private addComparableUrl(urls: Set<string>, value: string): void {
    if (!URL.canParse(value)) {
      return;
    }

    const url = new URL(value);

    if (!this.isHttpUrl(url)) {
      return;
    }

    urls.add(this.toComparableUrl(url));
  }

  private buildPageComparableUrls(
    baseUrl: string,
    page: OpenNavPageMetadata,
  ): ReadonlySet<string> {
    const urls = new Set<string>();

    this.addComparableUrl(urls, page.canonicalUrl);

    const routeUrl = this.buildSiteUrl(baseUrl, page.route);

    if (routeUrl !== undefined) {
      urls.add(routeUrl);
    }

    const sourcePageUrl = this.buildSiteUrl(
      baseUrl,
      this.buildSourcePagePath(page.sourceFilePath),
    );

    if (sourcePageUrl !== undefined) {
      urls.add(sourcePageUrl);
    }

    return urls;
  }

  private buildSitePath(basePath: string, sitePath: string): string {
    const normalizedBasePath = basePath.replace(/\/+$/u, "");
    const normalizedSitePath = sitePath.startsWith("/")
      ? sitePath
      : `/${sitePath}`;

    if (normalizedSitePath === "/") {
      if (normalizedBasePath === "") {
        return "/";
      }

      return `${normalizedBasePath}/`;
    }

    return `${normalizedBasePath}${normalizedSitePath}`;
  }

  private buildSiteUrl(baseUrl: string, sitePath: string): string | undefined {
    if (!URL.canParse(baseUrl)) {
      return undefined;
    }

    const url = new URL(baseUrl);

    if (!this.isHttpUrl(url)) {
      return undefined;
    }

    url.pathname = this.buildSitePath(url.pathname, sitePath);
    url.search = "";
    url.hash = "";

    return this.toComparableUrl(url);
  }

  private buildSourcePagePath(sourceFilePath: EngineFilePath): string {
    return `/${sourceFilePath.replaceAll("\\", "/").replace(/^\/+/u, "")}`;
  }

  private extractFragment(href: string): string {
    const fragmentIndex = href.indexOf("#");

    if (fragmentIndex === -1) {
      return "";
    }

    return href.slice(fragmentIndex);
  }

  private findMatchedPage(
    input: MarkdownLinkHrefRewriteInput,
  ): OpenNavPageMetadata | undefined {
    const resolvedUrl = this.resolveHref(input);

    if (resolvedUrl === undefined) {
      return undefined;
    }

    const resolvedComparableUrl = this.toComparableUrl(resolvedUrl);

    return input.pages.find((page: OpenNavPageMetadata): boolean =>
      this.buildPageComparableUrls(input.baseUrl, page).has(
        resolvedComparableUrl,
      ),
    );
  }

  private hasQueryMarker(href: string): boolean {
    const queryIndex = href.indexOf("?");

    if (queryIndex === -1) {
      return false;
    }

    const fragmentIndex = href.indexOf("#");

    return fragmentIndex === -1 || queryIndex < fragmentIndex;
  }

  private isHttpUrl(url: URL): boolean {
    return url.protocol === "http:" || url.protocol === "https:";
  }

  private isPureFragment(href: string): boolean {
    return href.startsWith("#");
  }

  private resolveHref(input: MarkdownLinkHrefRewriteInput): URL | undefined {
    if (
      input.href.trim() === "" ||
      this.isPureFragment(input.href) ||
      this.hasQueryMarker(input.href) ||
      !URL.canParse(input.currentPage.canonicalUrl) ||
      !URL.canParse(input.baseUrl) ||
      !URL.canParse(input.href, input.currentPage.canonicalUrl)
    ) {
      return undefined;
    }

    const baseUrl = new URL(input.baseUrl);
    const resolvedUrl = new URL(input.href, input.currentPage.canonicalUrl);

    if (
      !this.isHttpUrl(resolvedUrl) ||
      !this.isHttpUrl(baseUrl) ||
      resolvedUrl.origin !== baseUrl.origin
    ) {
      return undefined;
    }

    return resolvedUrl;
  }

  private toComparableUrl(url: URL): string {
    return `${url.origin}${url.pathname}`;
  }
}
