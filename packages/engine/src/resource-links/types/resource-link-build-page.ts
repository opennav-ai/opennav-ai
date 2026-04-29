import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";

/**
 * Page metadata and source text available to the resource-link builder.
 */
export interface ResourceLinkBuildPage {
  /**
   * Metadata-only page record for one built page.
   *
   * HTML pages receive planned `<head>` links. Markdown source pages are
   * preserved as caller-owned content and are ignored by this milestone.
   */
  readonly page: OpenNavPageMetadata;

  /**
   * Exact UTF-8 source file body for the page.
   *
   * HTML source is parsed to confirm that a real source `<head>` tag exists
   * before an edit is planned. Markdown source text is not modified here.
   */
  readonly sourceContent: string;
}
