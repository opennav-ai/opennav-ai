import type { EngineFile } from "../../input/types/engine-file";

/**
 * Input needed to create page metadata from already-read engine files.
 */
export interface FileMetadataReadInput {
  /**
   * Public site root used to build each page canonical URL.
   *
   * The value may include a path prefix, and route joining follows the same
   * rules as `PageUrlBuilder`.
   */
  readonly baseUrl: string;

  /**
   * Supported source files already read from the static output directory.
   *
   * HTML and Markdown files become page metadata entries. Files such as
   * `robots.txt` cannot produce page metadata, even though another engine phase
   * may still process them from the same read source file list.
   */
  readonly files: readonly EngineFile[];
}
