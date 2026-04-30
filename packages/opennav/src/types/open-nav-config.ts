import type { OpenNavAccessGuidanceOptions } from "./open-nav-access-guidance-options";
import type { OpenNavStaticSitePreset } from "./open-nav-static-site-preset";

/**
 * Options accepted by the shared OpenNav configuration helper.
 */
export interface OpenNavConfigOptions {
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
   * Built static output directory the CLI should scan when no `--output` flag
   * overrides it.
   *
   * Relative paths are resolved by the caller from the current project root.
   */
  readonly outputDirectory?: string | undefined;

  /**
   * Optional framework preset that supplies static-folder conventions.
   *
   * When omitted, callers should treat the configured output directory as a
   * generic static site folder.
   */
  readonly preset?: OpenNavStaticSitePreset | undefined;

  /**
   * Optional access guidance preferences for generated static policy files.
   *
   * When omitted, OpenNav should not create or edit `robots.txt` for Content
   * Signals policy.
   */
  readonly accessGuidance?: OpenNavAccessGuidanceOptions | undefined;
}
