import type { EngineFile } from "../../input/types/engine-file";

/**
 * Input needed to create lightweight page metadata from one already-read HTML file.
 */
export interface HtmlPageReadInput {
  /**
   * Public site root used to build the page canonical URL.
   *
   * The value may include a path prefix, and route joining follows the same
   * rules as `PageUrlBuilder`.
   */
  readonly baseUrl: string;

  /**
   * Source file content and output-directory-relative path for the HTML page.
   *
   * The file must have `kind: "html"`; other file kinds are rejected because
   * they require different extraction rules.
   */
  readonly file: EngineFile;
}
