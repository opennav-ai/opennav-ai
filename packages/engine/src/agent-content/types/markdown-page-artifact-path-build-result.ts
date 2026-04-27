import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * File path and public URL for a generated Markdown page artifact.
 */
export interface MarkdownPageArtifactPathBuildResult {
  /**
   * Output-directory-relative path where the generated Markdown page belongs.
   *
   * The path mirrors the source page structure and ends with `.md`, such as
   * `docs/index.html` becoming `docs/index.md`. A later generator creates the
   * content, and a later write planner decides whether the file is created or
   * modified on disk.
   */
  readonly outputFilePath: EngineFilePath;

  /**
   * Absolute URL that agents can fetch to read the generated Markdown page.
   *
   * The URL combines the configured `baseUrl` with `outputFilePath`, so sites
   * published under path prefixes keep artifact links under that prefix.
   */
  readonly publicUrl: string;
}
