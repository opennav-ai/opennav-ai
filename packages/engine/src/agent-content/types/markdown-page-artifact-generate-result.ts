import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * In-memory Markdown page artifact ready for write planning.
 */
export interface MarkdownPageArtifactGenerateResult {
  /**
   * Output-directory-relative path where the generated Markdown page belongs.
   *
   * The path mirrors the source page and ends with `.md`. This class does not
   * write the file; a later planner decides whether this path is created or
   * modified on disk.
   */
  readonly outputFilePath: EngineFilePath;

  /**
   * Absolute public URL where agents can read the generated Markdown page.
   *
   * The URL combines the configured site root with `outputFilePath`, preserving
   * any path prefix from `baseUrl`.
   */
  readonly publicUrl: string;

  /**
   * Complete UTF-8 Markdown content for the generated page file.
   *
   * Markdown source pages keep their body exactly. HTML source pages use the
   * parsed Markdown body returned by `PageMarkdownContentGenerator`.
   */
  readonly content: string;
}
