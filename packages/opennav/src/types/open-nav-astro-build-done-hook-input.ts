import type { OpenNavAstroLogger } from "./open-nav-astro-logger";

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
