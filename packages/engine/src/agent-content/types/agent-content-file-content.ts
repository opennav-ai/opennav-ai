import type { OpenNavError } from "../../common/types/opennav-error";

/**
 * Generated content returned when a lazy agent content file is read.
 */
export interface AgentContentFileContent {
  /**
   * Complete UTF-8 text body for one generated output file.
   *
   * The value is created only when the file's `getContent` callback is called,
   * allowing the builder to return a file plan without materializing every page
   * body in memory.
   */
  readonly content: string;

  /**
   * Non-fatal typed warnings discovered while creating this file body.
   *
   * Most files return an empty array. `llms-full.txt` can return token-cap
   * warnings here because the cap is evaluated when its content is generated.
   */
  readonly warnings: readonly OpenNavError[];
}
