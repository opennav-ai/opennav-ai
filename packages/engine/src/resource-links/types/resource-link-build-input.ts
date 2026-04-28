import type { ResourceLinkBuildPage } from "./resource-link-build-page";

/**
 * Site root and page source data needed to build resource-link plans.
 */
export interface ResourceLinkBuildInput {
  /**
   * Public site root used to build root `llms.txt` and Markdown mirror URLs.
   *
   * The value may include a path prefix, such as `https://example.com/docs`.
   * Generated links stay under this configured root.
   */
  readonly baseUrl: string;

  /**
   * Built pages available for resource-link planning.
   *
   * HTML pages are processed in this order. Markdown pages remain caller-owned
   * and are skipped by the HTML head planner.
   */
  readonly pages: readonly ResourceLinkBuildPage[];
}
