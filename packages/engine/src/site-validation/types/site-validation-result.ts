import type { SiteValidationMessage } from "./site-validation-message";

/**
 * Successful validation result for site settings and internal page data.
 */
export interface SiteValidationResult {
  /**
   * Non-fatal validation messages collected while checking the site.
   *
   * An empty array means the provided site settings and page metadata are ready
   * for later generators without fallback behavior.
   */
  readonly warnings: readonly SiteValidationMessage[];
}
