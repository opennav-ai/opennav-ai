import type { OpenNavAstroIntegration } from "./types/open-nav-astro-integration";
import type { OpenNavAstroOptions } from "./types/open-nav-astro-options";

export type { OpenNavAstroIntegration } from "./types/open-nav-astro-integration";
export type { OpenNavAstroOptions } from "./types/open-nav-astro-options";

/**
 * Creates the OpenNav Astro integration.
 *
 * @param options - Static Astro integration settings.
 * @returns An Astro-compatible integration shape with build hooks stubbed for
 * signature review.
 */
export function OpenNavAstro(
  options: OpenNavAstroOptions,
): OpenNavAstroIntegration {
  const mode = options.mode ?? "static";
  void mode;

  return {
    name: "@opennav-ai/opennav/astro",
    hooks: {},
  };
}
