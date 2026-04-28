/**
 * Final href value for one generated Markdown link.
 */
export interface MarkdownLinkHrefRewriteResult {
  /**
   * Href that should be written into the generated Markdown link.
   *
   * The value is either the original source href or the public URL of a known
   * page's generated Markdown endpoint. Fragment identifiers are preserved
   * when a known internal page link is rewritten.
   */
  readonly href: string;
}
