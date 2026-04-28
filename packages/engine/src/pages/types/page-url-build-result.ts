/**
 * Public route data derived from a built page file path.
 */
export interface PageUrlBuildResult {
  /**
   * Browser path where the page is served on the static site.
   *
   * The value always starts with `/`; directory index files end with `/`.
   */
  readonly route: string;

  /**
   * Absolute public URL for the page route.
   *
   * The value combines the configured site `baseUrl` with `route` and is used
   * later in generated files and discovery annotations, such as `llms.txt`,
   * Markdown artifacts, HTML head tags, and HTTP `Link` header guidance.
   */
  readonly canonicalUrl: string;
}
