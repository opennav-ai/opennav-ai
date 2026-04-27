import type { OpenNavPage } from "../../pages/types/opennav-page";

/**
 * Page data needed to create an optional `index.md` fallback file.
 */
export interface IndexMdFallbackGenerateInput {
  /**
   * Controls whether the selected caller or adapter supports emitting `index.md` fallbacks.
   *
   * When this value is `false`, the generator returns no fallback content and
   * no warning because the caller intentionally disabled the optional file.
   */
  readonly enabled: boolean;

  /**
   * Metadata-only page record for the page that may receive an `index.md` fallback.
   *
   * The root route can produce `index.md` in this first slice. Later page-level
   * support can derive nested fallback paths from this route without changing
   * the generated Markdown body contract.
   */
  readonly page: OpenNavPage;

  /**
   * Complete generated Markdown body to copy into the fallback file.
   *
   * The body should already come from `PageMarkdownContentGenerator`, so this
   * generator never reads source files or converts HTML itself.
   */
  readonly markdownContent: string;
}
