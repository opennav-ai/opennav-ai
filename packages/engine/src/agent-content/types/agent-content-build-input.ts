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
   * Deterministic fingerprint for the current OpenNav build run.
   *
   * Every generated file receives this value in its bottom build fingerprint
   * marker so later write planning can identify files from the same run.
   */
  readonly buildFingerprint: string;

  /**
   * Whether the same build run includes caller-configured Content Signals.
   *
   * When true, `/.well-known/opennav.json` reports the static
   * `content_signals` capability. When omitted, the manifest leaves that
   * capability false because OpenNav does not invent content-use policy.
   */
  readonly contentSignalsConfigured?: boolean | undefined;

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
