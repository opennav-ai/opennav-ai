import type { OpenNavAccessGuidanceOptions } from "./open-nav-policy";

/**
 * Static framework preset recognized by the public package.
 */
export type OpenNavStaticSitePreset = "astro" | "next-export";

/**
 * Build settings for a static-site OpenNav run.
 */
export interface OpenNavStaticSiteBuildOptions {
  /**
   * Preview generated file changes without writing them to the output folder.
   *
   * When `true`, the static runner should report created and modified paths as
   * planned changes only. When omitted, OpenNav should write planned changes.
   */
  readonly dryRun?: boolean | undefined;
}

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
  readonly accessGuidance?: OpenNavAccessGuidanceOptions | undefined;
}

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
