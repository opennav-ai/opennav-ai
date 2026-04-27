/**
 * Counts tokens in complete `llms-full.txt` content before optional generation.
 */
export interface LlmsFullTxtTokenCounter {
  /**
   * Counts model-tokenizer tokens for the supplied complete file content.
   *
   * @param content - Complete `llms-full.txt` text, including its final newline.
   * @returns Token count used to compare against the caller-provided limit.
   */
  count(content: string): number;
}
