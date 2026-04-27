import type { LlmsTxtPageSection } from "./llms-txt-page-section";

/**
 * Ordered page sections ready for `llms.txt` formatting.
 */
export interface LlmsTxtPageOrganizeResult {
  /**
   * Route-based page groups in the order they should appear in `llms.txt`.
   *
   * The root section appears first when the site has a root page. Remaining
   * sections are sorted by their route-derived heading.
   */
  readonly sections: readonly LlmsTxtPageSection[];
}
