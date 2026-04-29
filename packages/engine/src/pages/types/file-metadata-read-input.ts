import type { EngineFileReference } from "../../input/types/engine-file-reference";

/**
 * Input needed to create page metadata from discovered file references.
 */
export interface FileMetadataReadInput {
  /**
   * Built static site output directory that contains the referenced source files.
   *
   * The metadata reader passes this directory to one-file page readers. Page
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
   * HTML and Markdown references become page metadata entries. References such
   * as `robots.txt` cannot produce page metadata, even though another engine
   * phase may still process them from the original file list.
   */
  readonly fileReferences: readonly EngineFileReference[];
}
