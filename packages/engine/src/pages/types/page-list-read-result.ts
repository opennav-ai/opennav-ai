import type { EngineFilePath } from "../../types/engine-file-path";
import type { OpenNavPage } from "./opennav-page";

/**
 * Result data returned after creating internal page metadata from file references.
 */
export interface PageListReadResult {
  /**
   * Metadata-only page records created from HTML and Markdown source files.
   *
   * Entries preserve the input file reference order for page files. Each entry
   * includes source path, route, canonical URL, title, and description, but not
   * the page body.
   */
  readonly pages: readonly OpenNavPage[];

  /**
   * Output-directory-relative paths that were intentionally excluded from page data.
   *
   * Crawler guidance files such as `robots.txt` can still be
   * used by later guidance builders, but they are not pages and therefore do
   * not appear in `pages`.
   */
  readonly skippedFilePaths: readonly EngineFilePath[];
}
