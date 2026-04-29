import type { EngineAccessGuidanceOptions } from "@opennav-ai/engine";
import type { OpenNavStaticSitePreset } from "./open-nav-static-site-preset";

/**
 * Options for running OpenNav against one built static output folder.
 */
export interface OpenNavStaticSiteOptions {
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
   * Built static output directory to scan for prerendered HTML and Markdown.
   *
   * Relative paths are resolved by the caller from the current project root.
   */
  readonly outputDirectory: string;

  /**
   * Optional framework preset that supplies static-folder conventions.
   *
   * When omitted, the runner should treat `outputDirectory` as a generic
   * static site folder.
   */
  readonly preset?: OpenNavStaticSitePreset | undefined;

  /**
   * Optional access guidance preferences for generated static policy files.
   *
   * When omitted, OpenNav should not create or edit `robots.txt` for Content
   * Signals policy.
   */
  readonly accessGuidance?: EngineAccessGuidanceOptions | undefined;
}
