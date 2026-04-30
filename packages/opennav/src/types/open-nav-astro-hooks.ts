import type { OpenNavAstroBuildDoneHookInput } from "./open-nav-astro-build-done-hook-input";
import type { OpenNavAstroConfigDoneHookInput } from "./open-nav-astro-config-done-hook-input";
import type { OpenNavAstroHook } from "./open-nav-astro-hook";

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
