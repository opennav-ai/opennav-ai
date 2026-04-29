import type { OpenNavNextConfig } from "./types/open-nav-next-config";
import type { OpenNavNextOptions } from "./types/open-nav-next-options";

export type { OpenNavNextConfig } from "./types/open-nav-next-config";
export type { OpenNavNextOptions } from "./types/open-nav-next-options";

/**
 * Creates the OpenNav Next.js config wrapper.
 *
 * @param options - Static Next export integration settings.
 * @returns A wrapper that preserves the supplied Next config until build hooks
 * are implemented.
 */
export function OpenNavNext(
  options: OpenNavNextOptions,
): <Configuration extends OpenNavNextConfig>(
  nextConfig: Configuration,
) => Configuration {
  const mode = options.mode ?? "static";
  void mode;

  return <Configuration extends OpenNavNextConfig>(
    nextConfig: Configuration,
  ): Configuration => nextConfig;
}
