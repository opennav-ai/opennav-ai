import type { EngineFileReference } from "../../input/types/engine-file-reference";

/**
 * Input needed to create lightweight page metadata from one HTML file.
 */
export interface HtmlPageReadInput {
  /**
   * Built static site output directory that contains the source HTML file.
   *
   * The reader uses this directory only to read the one referenced file while
   * extracting metadata; the returned page does not retain the file body.
   */
  readonly outputDirectory: string;

  /**
   * Public site root used to build the page canonical URL.
   *
   * The value may include a path prefix, and route joining follows the same
   * rules as `PageUrlBuilder`.
   */
  readonly baseUrl: string;

  /**
   * Lightweight supported file reference for the HTML source page.
   *
   * The reference must have `kind: "html"`; other file kinds are rejected
   * because they require different extraction rules.
   */
  readonly fileReference: EngineFileReference;
}
