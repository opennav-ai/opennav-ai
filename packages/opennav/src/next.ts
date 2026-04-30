import { OpenNavNextStaticBuildRunner } from "./services/open-nav-next-static-build-runner";
import type {
  OpenNavNextConfig,
  OpenNavNextOptions,
} from "./types/open-nav-next";

export type {
  OpenNavNextConfig,
  OpenNavNextOptions,
} from "./types/open-nav-next";

/**
 * Creates the OpenNav Next.js config wrapper.
 *
 * @param options - Static Next export integration settings.
 * @returns A wrapper that preserves the supplied Next config and runs OpenNav
 * after supported static export builds.
 */
export function OpenNavNext(
  options: OpenNavNextOptions,
): <Configuration extends OpenNavNextConfig>(
  nextConfig: Configuration,
) => Configuration {
  const mode = options.mode ?? "static";
  const runner = new OpenNavNextStaticBuildRunner({
    ...options,
    mode,
  });

  return <Configuration extends OpenNavNextConfig>(
    nextConfig: Configuration,
  ): Configuration => {
    const result = runner.register(nextConfig);

    if (result.isErr()) {
      throw new Error(`${result.error.code}: ${result.error.message}`);
    }

    return nextConfig;
  };
}
