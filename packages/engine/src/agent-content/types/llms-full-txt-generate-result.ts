import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * In-memory `llms-full.txt` generation result.
 */
export interface LlmsFullTxtGenerateResult {
  /**
   * Output-directory-relative path where generated `llms-full.txt` belongs.
   *
   * The value is `"llms-full.txt"` when complete content is available. It is
   * `undefined` when the optional full-context file was skipped, such as when
   * the caller-provided token limit is exceeded.
   */
  readonly outputFilePath: EngineFilePath | undefined;

  /**
   * Complete UTF-8 text content for `llms-full.txt`.
   *
   * The value is ready to write as-is and includes its final trailing newline.
   * It is `undefined` when the file was skipped; skipped paths and reasons are
   * available in `skippedFilePaths` and `warnings`.
   */
  readonly content: string | undefined;

  /**
   * Output-directory-relative paths for optional files not generated.
   *
   * The array is empty when `llms-full.txt` content is available. It contains
   * `"llms-full.txt"` when the complete output exceeds `maxContentTokens`.
   */
  readonly skippedFilePaths: readonly EngineFilePath[];

  /**
   * Non-fatal typed warnings explaining why optional content was skipped.
   *
   * When the token limit is exceeded, this includes
   * `LLMS_FULL_TXT_TOKEN_LIMIT_EXCEEDED` with the configured limit and actual
   * complete token count in the warning context.
   */
  readonly warnings: readonly OpenNavError[];
}
