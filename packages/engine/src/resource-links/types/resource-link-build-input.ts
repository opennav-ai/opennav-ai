import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";

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
   * Absolute or process-relative path to the built static output directory.
   *
   * HTML page source paths are resolved under this directory before their
   * current bodies are read for safe `<head>` insertion planning. The builder
   * does not write to this directory.
   */
  readonly outputDirectory: string;

  /**
   * Built pages available for resource-link planning.
   *
   * HTML page source files are read in this order and used to plan resource
   * links. Markdown pages remain caller-owned and are skipped without reading
   * their source files.
   */
  readonly pages: readonly OpenNavPageMetadata[];
}
