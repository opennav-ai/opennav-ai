import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";

/**
 * Site context and raw link data needed to rewrite one Markdown link href.
 */
export interface MarkdownLinkHrefRewriteInput {
  /**
   * Public site root used to calculate generated Markdown artifact URLs.
   *
   * The value may include a path prefix, such as `https://example.com/docs`.
   * Known internal page links are rewritten under this root when a matching
   * generated Markdown endpoint exists.
   */
  readonly baseUrl: string;

  /**
   * Metadata-only page record for the source page that contains the link.
   *
   * Document-relative hrefs are resolved against this page's canonical URL
   * before they are compared with known page routes and source URLs.
   */
  readonly currentPage: OpenNavPageMetadata;

  /**
   * Validated metadata-only page records for the current static site.
   *
   * A link is rewritten only when it resolves to one of these pages. Unknown
   * routes are preserved exactly so generated Markdown does not invent page
   * endpoints that OpenNav did not plan.
   */
  readonly pages: readonly OpenNavPageMetadata[];

  /**
   * Raw href value read from a source page link.
   *
   * The original value is returned unchanged for external URLs, non-HTTP
   * schemes, pure fragments, query URLs, assets, malformed URLs, and unknown
   * internal routes.
   */
  readonly href: string;
}
