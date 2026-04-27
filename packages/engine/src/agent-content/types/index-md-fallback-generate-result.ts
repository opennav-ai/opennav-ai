import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * In-memory optional `index.md` fallback generation result.
 */
export interface IndexMdFallbackGenerateResult {
  /**
   * Output-directory-relative path where the fallback Markdown file belongs.
   *
   * The value is `"index.md"` for the root fallback when enabled and supported.
   * It is `undefined` when no fallback file should be emitted.
   */
  readonly outputFilePath: EngineFilePath | undefined;

  /**
   * Complete UTF-8 Markdown content for the fallback file.
   *
   * The value is copied from the generated page Markdown body. It is
   * `undefined` when no fallback file should be emitted.
   */
  readonly content: string | undefined;

  /**
   * Output-directory-relative fallback paths intentionally skipped.
   *
   * Disabled fallback generation is a caller choice, so this first slice leaves
   * the array empty instead of reporting a skipped path or warning.
   */
  readonly skippedFilePaths: readonly EngineFilePath[];

  /**
   * Non-fatal typed warnings explaining notable fallback skips.
   *
   * The first root fallback slice has no warning cases. Later page-level
   * support can add structured warnings here without changing the result shape.
   */
  readonly warnings: readonly OpenNavError[];
}
