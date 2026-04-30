import type { OpenNavAstroConfig } from "./open-nav-astro-config";
import type { OpenNavAstroLogger } from "./open-nav-astro-logger";

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
