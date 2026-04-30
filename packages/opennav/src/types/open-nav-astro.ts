import type { OpenNavAccessGuidanceOptions } from "./open-nav-policy";

/**
 * Minimal Astro logger methods used by the OpenNav integration.
 */
export interface OpenNavAstroLogger {
  /**
   * Optional build failure output channel supplied by Astro.
   *
   * When available, OpenNav writes typed failure messages here before the hook
   * aborts the Astro build.
   */
  readonly error?: ((message: string) => void) | undefined;

  /**
   * Optional normal build output channel supplied by Astro.
   *
   * When available, OpenNav writes a short success summary here after generated
   * files and page edits are complete.
   */
  readonly info?: ((message: string) => void) | undefined;

  /**
   * Optional warning output channel supplied by Astro.
   *
   * When available, OpenNav writes non-fatal engine warnings here after a
   * successful run.
   */
  readonly warn?: ((message: string) => void) | undefined;
}

/**
 * Minimal Astro config fields consumed by the OpenNav integration.
 */
export interface OpenNavAstroConfig {
  /**
   * Public absolute site URL from Astro's top-level `site` setting.
   *
   * OpenNav uses this value only when `OpenNavAstro({ siteUrl })` is omitted.
   */
  readonly site?: string | undefined;
}

/**
 * Astro `astro:config:done` hook input fields consumed by OpenNav.
 */
export interface OpenNavAstroConfigDoneHookInput {
  /**
   * Astro's resolved config object after user config normalization.
   *
   * OpenNav reads the `site` URL from this object when the integration options
   * do not provide `siteUrl`.
   */
  readonly config: OpenNavAstroConfig;

  /**
   * Optional static/server output mode supplied by newer Astro versions.
   *
   * When populated with `server`, OpenNav static mode reports a typed failure
   * instead of scanning a server build folder.
   */
  readonly buildOutput?: "server" | "static" | undefined;

  /**
   * Astro logger for hook status, warnings, and failures.
   *
   * The current config hook stores state only, so this is accepted for
   * structural compatibility with Astro.
   */
  readonly logger: OpenNavAstroLogger;
}

/**
 * Astro `astro:build:done` hook input fields consumed by OpenNav.
 */
export interface OpenNavAstroBuildDoneHookInput {
  /**
   * File URL for Astro's generated static output directory.
   *
   * OpenNav converts this URL into the `outputDirectory` passed to the
   * static-site SDK runner.
   */
  readonly dir: URL;

  /**
   * Astro logger for build status, warnings, and failures.
   *
   * OpenNav writes a short build summary and any non-fatal engine warnings to
   * this logger when the corresponding methods are available.
   */
  readonly logger: OpenNavAstroLogger;
}

/**
 * Function shape for one Astro integration hook handled by OpenNav.
 */
export type OpenNavAstroHook<Input> = (input: Input) => Promise<void> | void;

/**
 * Astro build hooks installed by the OpenNav integration.
 */
export interface OpenNavAstroHooks {
  /**
   * Captures Astro's resolved `site` URL before the build output exists.
   *
   * This hook does not write files; it stores the URL that `astro:build:done`
   * will use if the user did not pass `siteUrl` directly to OpenNav.
   */
  readonly "astro:config:done": OpenNavAstroHook<OpenNavAstroConfigDoneHookInput>;

  /**
   * Runs OpenNav after Astro has emitted the static output directory.
   *
   * This hook scans Astro's `dir`, calls the static-site SDK runner, and writes
   * OpenNav files and HTML resource links into the built `dist` folder.
   */
  readonly "astro:build:done": OpenNavAstroHook<OpenNavAstroBuildDoneHookInput>;
}

/**
 * Minimal Astro integration shape returned without depending on Astro types.
 */
export interface OpenNavAstroIntegration {
  /**
   * Stable integration name Astro can display in build output.
   *
   * The shell uses the public subpath so users can connect messages to their
   * `astro.config.*` import.
   */
  readonly name: string;

  /**
   * Astro hook map installed by the integration.
   *
   * Static mode installs `astro:config:done` to capture the site URL and
   * `astro:build:done` to run OpenNav against Astro's generated `dist` folder.
   */
  readonly hooks: OpenNavAstroHooks;
}

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
  readonly accessGuidance?: OpenNavAccessGuidanceOptions | undefined;
}
