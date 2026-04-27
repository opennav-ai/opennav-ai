import type { LlmsTxtPageLink } from "./llms-txt-page-link";

/**
 * A named group of page links written as one section in `llms.txt`.
 */
export interface LlmsTxtPageSection {
  /**
   * Section title written as a Markdown heading in `llms.txt`.
   *
   * The value is derived from page routes, such as `/` becoming `Root` and
   * `/docs/cli/options` becoming `Docs / CLI`.
   */
  readonly heading: string;

  /**
   * Ordered page links that belong under this section heading.
   *
   * Links point at generated Markdown artifacts and are sorted by route within
   * each section for stable output across adapters.
   */
  readonly links: readonly LlmsTxtPageLink[];
}
