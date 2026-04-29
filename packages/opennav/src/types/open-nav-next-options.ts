import type { EngineAccessGuidanceOptions } from "@opennav-ai/engine";

/**
 * Options accepted by the Next.js OpenNav config wrapper.
 */
export interface OpenNavNextOptions {
  /**
   * Human-readable name written into generated agent-facing files.
   *
   * This value should match the site or docs product name a user would
   * recognize.
   */
  readonly siteName: string;

  /**
   * Public absolute site URL used to build canonical page and metadata URLs.
   *
   * The value should include the protocol and host, such as
   * `https://example.com`.
   */
  readonly siteUrl: string;

  /**
   * Integration execution mode.
   *
   * Phase 1 supports only static Next exports. When omitted, the integration
   * should behave as `"static"`.
   */
  readonly mode?: "static" | undefined;

  /**
   * Built static export directory to scan after a Next build.
   *
   * When omitted, the Next integration should use the static export default of
   * `out`.
   */
  readonly outputDirectory?: string | undefined;

  /**
   * Optional access guidance preferences for generated static policy files.
   *
   * When omitted, OpenNav should not create or edit `robots.txt` for Content
   * Signals policy.
   */
  readonly accessGuidance?: EngineAccessGuidanceOptions | undefined;
}
