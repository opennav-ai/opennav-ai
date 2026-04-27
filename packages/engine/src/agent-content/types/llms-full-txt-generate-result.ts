import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * In-memory `llms-full.txt` generation result.
 */
export interface LlmsFullTxtGenerateResult {
  /**
   * Output-directory-relative path where generated `llms-full.txt` belongs.
   *
   * The value is `"llms-full.txt"`. When the token limit is reached, the file
   * still exists with the page blocks that fit before the next block would
   * exceed `maxContentTokens`.
   */
  readonly outputFilePath: EngineFilePath;

  /**
   * Complete UTF-8 text content for `llms-full.txt`.
   *
   * The value is ready to write as-is and includes its final trailing newline.
   * It may contain a capped subset of page blocks when adding the next complete
   * page block would exceed `maxContentTokens`.
   */
  readonly content: string;

  /**
   * Output-directory-relative paths for optional files not generated.
   *
   * The array is empty for `llms-full.txt` token caps because the file is still
   * generated with the content that fit.
   */
  readonly skippedFilePaths: readonly EngineFilePath[];

  /**
   * Non-fatal typed warnings explaining why page blocks were omitted.
   *
   * When the token limit is reached, this includes
   * `LLMS_FULL_TXT_TOKEN_LIMIT_REACHED` with the configured limit, final token
   * count, omitted page count, and omitted source paths in the warning context.
   */
  readonly warnings: readonly OpenNavError[];
}
