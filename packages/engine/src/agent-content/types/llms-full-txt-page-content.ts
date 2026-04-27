import type { OpenNavPage } from "../../pages/types/opennav-page";

/**
 * Generated Markdown body tied to the page metadata that produced it.
 */
export interface LlmsFullTxtPageContent {
  /**
   * Metadata-only page record used for route grouping and artifact URL creation.
   *
   * The source path and route decide where this page appears in `llms-full.txt`.
   * The source content type can distinguish Markdown pages from HTML pages that
   * were converted before this generator received their body.
   */
  readonly page: OpenNavPage;

  /**
   * Complete generated Markdown body for the page.
   *
   * Existing Markdown source pages can provide their original body. HTML source
   * pages should provide the already converted Markdown body returned by
   * `PageMarkdownContentGenerator`.
   */
  readonly markdownContent: string;
}
