import type { OpenNavContentExtractionOptions } from "./open-nav-content-extraction";
import type { OpenNavAccessGuidanceOptions } from "./open-nav-policy";
import type {
  OpenNavStaticHeadersOptions,
  OpenNavStaticPlatform,
} from "./open-nav-static-site";

/**
 * Minimal Next.js config shape accepted without depending on Next types.
 */
export interface OpenNavNextConfig {
  /**
   * Next.js build output mode from `next.config.*`.
   *
   * OpenNav supports only static export builds, so this value must be
   * `"export"` before the wrapper registers its post-build OpenNav run.
   */
  readonly output?: unknown;

  /**
   * Static export folder configured in `next.config.*`.
   *
   * When this is a string and `OpenNavNextOptions.outputDirectory` is omitted,
   * OpenNav scans this folder after `next build`. Relative paths are resolved
   * from the working directory that runs `next build`; absolute paths are
   * rejected.
   */
  readonly distDir?: unknown;

  /**
   * Framework-specific Next.js config values passed through by the shell.
   *
   * The public wrapper keeps these values untouched so projects can continue to
   * use their exact `next.config.*` shape.
   */
  readonly [key: string]: unknown;
}

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
   * When omitted, the Next integration should use `nextConfig.distDir` when it
   * is a string, then fall back to the static export default of `out`. Relative
   * paths are resolved from the working directory that runs `next build`;
   * absolute paths are rejected.
   */
  readonly outputDirectory?: string | undefined;

  /**
   * Optional static hosting platform for platform-specific output behavior.
   *
   * `"cloudflare-pages"` creates or updates the Cloudflare Pages `_headers`
   * file inside the static export folder unless `staticHeaders.enabled` is
   * `false`.
   */
  readonly platform?: OpenNavStaticPlatform | undefined;

  /**
   * Optional access guidance preferences for generated static policy files.
   *
   * When omitted, OpenNav should not create or edit `robots.txt` for Content
   * Signals policy.
   */
  readonly accessGuidance?: OpenNavAccessGuidanceOptions | undefined;

  /**
   * Optional HTML content extraction preferences for generated readable files.
   *
   * When omitted, OpenNav converts the whole source `<body>` for HTML page
   * artifacts and `llms-full.txt`. Set `stripLayout` to remove only the
   * documented fixed layout elements before Markdown conversion.
   */
  readonly contentExtraction?: OpenNavContentExtractionOptions | undefined;

  /**
   * Optional static hosting response-header artifact settings.
   *
   * When omitted and `platform` is configured, OpenNav should use the platform
   * default. Set `enabled` to `false` to opt out of files such as Cloudflare
   * Pages `_headers`.
   */
  readonly staticHeaders?: OpenNavStaticHeadersOptions | undefined;
}
