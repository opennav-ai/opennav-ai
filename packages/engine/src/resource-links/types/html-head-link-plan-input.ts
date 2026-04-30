import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import type { ResourceLink } from "./resource-link";

/**
 * Source page content and links needed to plan one HTML `<head>` edit.
 */
export interface HtmlHeadLinkPlanInput {
  /**
   * Metadata-only page record for the HTML file being edited.
   *
   * The source file path is used in the returned page edit and in any warning
   * if the file has no safe source `<head>` insertion point.
   */
  readonly page: OpenNavPageMetadata;

  /**
   * Short build fingerprint written into each managed HTML link for this run.
   *
   * Every OpenNav-managed `<link>` tag planned from one engine execution uses
   * this same value so reruns can identify and replace the run's managed head
   * links consistently.
   */
  readonly resourceLinkFingerprint: string;

  /**
   * Exact UTF-8 HTML source body for the page.
   *
   * The planner parses this text with source locations enabled and only plans
   * an edit when the `<head>` element exists in the original source.
   */
  readonly sourceContent: string;

  /**
   * Resource links that should be serialized as HTML `<link>` tags.
   *
   * The order is preserved in the generated `headLinkMarkup`.
   */
  readonly links: readonly ResourceLink[];
}
