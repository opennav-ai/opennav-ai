import type { EngineFileReference } from "../../input/types/engine-file-reference";

/**
 * Input needed to create internal page metadata from discovered file references.
 */
export interface PageListReadInput {
  /**
   * Built static site output directory that contains the referenced source files.
   *
   * The page list reader passes this directory to one-file page readers. Page
   * bodies are read one at a time and are not retained in the returned page list.
   */
  readonly outputDirectory: string;

  /**
   * Public site root used to build each page canonical URL.
   *
   * The value may include a path prefix, and route joining follows the same
   * rules as `PageUrlBuilder`.
   */
  readonly baseUrl: string;

  /**
   * Lightweight file references discovered under `outputDirectory`.
   *
   * HTML and Markdown references become `OpenNavPage` entries. Non-page
   * references such as `robots.txt` are returned in
   * `skippedFilePaths` so later reports can say they were intentionally ignored
   * for page data.
   */
  readonly fileReferences: readonly EngineFileReference[];
}
