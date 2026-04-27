import { Tiktoken } from "js-tiktoken/lite";
import o200kBase from "js-tiktoken/ranks/o200k_base";
import type { LlmsFullTxtTokenCounter } from "../types/llms-full-txt-token-counter";

/**
 * Counts `llms-full.txt` tokens with the local `o200k_base` tokenizer ranks.
 */
export class O200kBaseLlmsFullTxtTokenCounter
  implements LlmsFullTxtTokenCounter
{
  readonly #tokenizer: Tiktoken;

  /**
   * Creates a local tokenizer-backed counter without network access.
   */
  public constructor() {
    this.#tokenizer = new Tiktoken(o200kBase);
  }

  /**
   * Counts `o200k_base` tokens for complete `llms-full.txt` content.
   *
   * @param content - Complete file content to count.
   * @returns Number of tokens produced by `js-tiktoken`.
   */
  public count(content: string): number {
    return this.#tokenizer.encode(content, "all").length;
  }
}
