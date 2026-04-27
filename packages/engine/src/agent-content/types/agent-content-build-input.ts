import type { AgentContentBuildPage } from "./agent-content-build-page";

/**
 * Site metadata and lazy page readers needed to plan agent-readable files.
 */
export interface AgentContentBuildInput {
  /**
   * Human-readable site name shown in generated `llms.txt` and `llms-full.txt`.
   *
   * The value should already be validated before the builder runs.
   */
  readonly siteName: string;

  /**
   * Public site root used to build generated Markdown artifact URLs.
   *
   * The value is passed to lower-level generators so links in `llms.txt` and
   * `llms-full.txt` point at the same output-directory-relative Markdown paths.
   */
  readonly baseUrl: string;

  /**
   * Optional short summary for the whole site.
   *
   * When populated, `llms.txt` and `llms-full.txt` include it under the site
   * heading. When omitted, no site-level summary line is written.
   */
  readonly siteDescription?: string | undefined;

  /**
   * Maximum token count for generated `llms-full.txt` content.
   *
   * Version 1 callers should pass `DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS`.
   * Future configuration can pass a different value without changing the
   * generator contract.
   */
  readonly maxLlmsFullContentTokens: number;

  /**
   * Source pages available for generated Markdown artifacts and `llms-full.txt`.
   *
   * Page metadata is used during planning. Existing Markdown source page paths
   * reserve their matching `.md` output paths, and page body callbacks are used
   * later by individual lazy files.
   */
  readonly pages: readonly AgentContentBuildPage[];
}
