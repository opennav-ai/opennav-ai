import type { OpenNavPage } from "../../pages/types/opennav-page";

/**
 * Source page data needed to produce one in-memory Markdown page body.
 */
export interface PageMarkdownContentGenerateInput {
  /**
   * Metadata-only page record for the source file being converted.
   *
   * The `sourceContentType` field decides whether the supplied body can be
   * reused as Markdown or must be parsed from HTML. The `sourceFilePath` value
   * is used only for structured errors and later diagnostics; this generator
   * does not read from or write to that path.
   */
  readonly page: OpenNavPage;

  /**
   * Exact UTF-8 body read from the page source file.
   *
   * Markdown page bodies should be preserved in generated content. HTML page
   * bodies will be parsed with `parse5` by the implementation before Markdown
   * is returned.
   */
  readonly sourceContent: string;
}
