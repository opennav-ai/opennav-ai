import type { LlmsFullTxtPageContent } from "./llms-full-txt-page-content";

/**
 * Site metadata and generated page bodies needed to create `llms-full.txt`.
 */
export interface LlmsFullTxtGenerateInput {
  /**
   * Human-readable site name shown as the top-level heading in `llms-full.txt`.
   *
   * The value should come from validated engine input so the generated file can
   * identify the static site before including full page bodies.
   */
  readonly siteName: string;

  /**
   * Public site root used as the prefix for generated Markdown artifact URLs.
   *
   * Page entries in `llms-full.txt` point to mirrored `.md` endpoints, and this
   * value determines their absolute URL prefix.
   */
  readonly baseUrl: string;

  /**
   * Optional short summary for the whole site.
   *
   * When populated, the generated `llms-full.txt` includes this text under the
   * site heading as a Markdown blockquote. When omitted, no site-level summary
   * line is written.
   */
  readonly siteDescription?: string | undefined;

  /**
   * Maximum allowed token count for the complete `llms-full.txt` content.
   *
   * The caller must provide this value explicitly. If adding the next complete
   * page block would exceed this limit according to the configured token
   * counter, the generator stops before that page and reports a warning instead
   * of truncating the page body mid-block.
   */
  readonly maxContentTokens: number;

  /**
   * Generated Markdown bodies that should appear inline in `llms-full.txt`.
   *
   * Each entry carries the page metadata needed for route ordering plus the
   * body text already produced by earlier page content generation.
   */
  readonly pages: readonly LlmsFullTxtPageContent[];
}
