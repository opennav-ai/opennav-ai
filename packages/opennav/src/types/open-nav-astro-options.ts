import type { EngineAccessGuidanceOptions } from "@opennav-ai/engine";

/**
 * Options accepted by the Astro OpenNav integration.
 */
export interface OpenNavAstroOptions {
  /**
   * Human-readable name written into generated agent-facing files.
   *
   * This value should match the site or docs product name a user would
   * recognize.
   */
  readonly siteName: string;

  /**
   * Public absolute site URL used when Astro does not provide `site`.
   *
   * The value should include the protocol and host, such as
   * `https://example.com`.
   */
  readonly siteUrl?: string | undefined;

  /**
   * Integration execution mode.
   *
   * Phase 1 supports only static Astro builds. When omitted, the integration
   * should behave as `"static"`.
   */
  readonly mode?: "static" | undefined;

  /**
   * Optional access guidance preferences for generated static policy files.
   *
   * When omitted, OpenNav should not create or edit `robots.txt` for Content
   * Signals policy.
   */
  readonly accessGuidance?: EngineAccessGuidanceOptions | undefined;
}
