import type { OpenNavPage } from "../../pages/types/opennav-page";

/**
 * Validated page metadata needed to build ordered `llms.txt` sections.
 */
export interface LlmsTxtPageOrganizeInput {
  /**
   * Public site root used as the prefix for generated Markdown artifact URLs.
   *
   * The value may include a path prefix, such as `https://example.com/docs`.
   */
  readonly baseUrl: string;

  /**
   * Metadata-only page records to group for `llms.txt`.
   *
   * The organizer sorts these records into stable route-based sections instead
   * of relying on adapter-specific discovery order.
   */
  readonly pages: readonly OpenNavPage[];
}
