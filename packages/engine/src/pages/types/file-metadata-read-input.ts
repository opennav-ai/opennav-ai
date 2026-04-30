import type { EngineFileReference } from "../../input/types/engine-file-reference";

/**
 * Input needed to prepare supported source files for metadata-driven planning.
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
   * Built static site output directory that contains every source reference.
   *
   * Each file reference is resolved relative to this directory before content
   * is read for page metadata and source fingerprints.
   */
  readonly outputDirectory: string;

  /**
   * Supported source file references produced by the input file list reader.
   *
   * HTML and Markdown files may become page metadata entries. `robots.txt`
   * contributes to build fingerprints and later access-guidance lookup, but it
   * does not produce page metadata.
   */
  readonly fileReferences: readonly EngineFileReference[];
}
