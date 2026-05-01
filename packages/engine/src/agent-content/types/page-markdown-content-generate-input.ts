import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import type { EngineContentExtractionOptions } from "../../types/engine-content-extraction-options";

/**
 * Source page data needed to produce one in-memory Markdown page body.
 */
export interface PageMarkdownContentGenerateInput {
  /**
   * Public site root used to calculate generated Markdown artifact URLs.
   *
   * HTML link conversion uses this value when a source link points at another
   * known page and should be rewritten to that page's `.md` endpoint.
   */
  readonly baseUrl: string;

  /**
   * Metadata-only page record for the source file being converted.
   *
   * The `sourceContentType` field decides whether the supplied body can be
   * reused as Markdown or must be parsed from HTML. The `sourceFilePath` value
   * is used only for structured errors and later diagnostics; this generator
   * does not read from or write to that path.
   */
  readonly page: OpenNavPageMetadata;

  /**
   * Validated metadata-only page records for the current static site.
   *
   * HTML link conversion uses this list as the only set of internal pages that
   * may be rewritten to generated Markdown endpoints. Unknown routes remain
   * unchanged in generated page content.
   */
  readonly pages: readonly OpenNavPageMetadata[];

  /**
   * Optional HTML content extraction preferences for generated Markdown.
   *
   * Markdown source pages are returned unchanged. HTML source pages convert the
   * whole source `<body>` by default and strip only the documented fixed layout
   * elements before conversion when `stripLayout` is enabled.
   */
  readonly contentExtraction?: EngineContentExtractionOptions | undefined;

  /**
   * Exact UTF-8 body read from the page source file.
   *
   * Markdown page bodies should be preserved in generated content. HTML page
   * bodies will be parsed with `parse5` by the implementation before Markdown
   * is returned.
   */
  readonly sourceContent: string;
}
