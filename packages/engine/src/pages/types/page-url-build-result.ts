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
   * later in generated files such as `llms.txt` and `ai/tree.json`.
   */
  readonly canonicalUrl: string;
}
