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
   * Short build fingerprint for the current engine run.
   *
   * Resource-link planning writes this exact value into every managed HTML
   * `<link>` tag created during the run. The value uses
   * `sha256:<12 hex characters>` format and matches generated file markers,
   * `robots.txt`, and `/.well-known/opennav.json`.
   */
  readonly buildFingerprint: string;

  /**
   * Built pages available for resource-link planning.
   *
   * HTML pages are processed in this order. Markdown pages remain caller-owned
   * and are skipped by the HTML head planner.
   */
  readonly pages: readonly ResourceLinkBuildPage[];
}
