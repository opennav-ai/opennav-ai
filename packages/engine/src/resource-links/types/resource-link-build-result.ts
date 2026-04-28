import type { OpenNavError } from "../../common/types/opennav-error";
import type { ResourceLinkPageEdit } from "./resource-link-page-edit";

/**
 * In-memory resource-link plans for HTML pages.
 */
export interface ResourceLinkBuildResult {
  /**
   * Planned HTML page edits in input page order.
   *
   * Each edit inserts links into a real source `<head>` element. HTML pages
   * without a safe insertion point are omitted and reported in `warnings`.
   */
  readonly pageEdits: readonly ResourceLinkPageEdit[];

  /**
   * Non-fatal problems found while planning resource links.
   *
   * Missing source `<head>` tags are reported here so callers can continue with
   * generated files without silently skipping page edits.
   */
  readonly warnings: readonly OpenNavError[];
}
