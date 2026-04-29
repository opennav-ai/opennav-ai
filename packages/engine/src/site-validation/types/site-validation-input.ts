import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import type { SiteValidationMode } from "./site-validation-mode";

/**
 * Input needed to check site settings and internal page data before generation.
 */
export interface SiteValidationInput {
  /**
   * Human-readable site name that generated files can show to agents.
   *
   * Validation checks this value before generators use it in files such as
   * `llms.txt`.
   */
  readonly siteName: string;

  /**
   * Public site root used to confirm generated canonical URLs belong to the site.
   *
   * The value should be an absolute URL. Validation decides whether a malformed
   * value stops generation or can be reported as a warning.
   */
  readonly baseUrl: string;

  /**
   * Metadata-only page records created from built HTML and Markdown files.
   *
   * Validation checks these pages before generators rely on routes, canonical
   * URLs, titles, and descriptions.
   */
  readonly pages: readonly OpenNavPageMetadata[];

  /**
   * Validation behavior for recoverable missing data.
   *
   * `strict` turns required missing page data into typed failures. `loose`
   * allows safe fallbacks to continue with warnings.
   */
  readonly mode: SiteValidationMode;
}
