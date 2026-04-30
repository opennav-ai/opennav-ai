import type { OpenNavAstroHooks } from "./open-nav-astro-hooks";

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
