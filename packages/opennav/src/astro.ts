import { OpenNavAstroStaticBuildRunner } from "./services/open-nav-astro-static-build-runner";
import type {
  OpenNavAstroBuildDoneHookInput,
  OpenNavAstroConfigDoneHookInput,
  OpenNavAstroIntegration,
  OpenNavAstroOptions,
} from "./types/open-nav-astro";

export type {
  OpenNavAstroIntegration,
  OpenNavAstroOptions,
} from "./types/open-nav-astro";

/**
 * Creates the OpenNav Astro integration.
 *
 * @param options - Static Astro integration settings.
 * @returns An Astro-compatible integration shape that runs OpenNav after
 * static builds.
 */
export function OpenNavAstro(
  options: OpenNavAstroOptions,
): OpenNavAstroIntegration {
  const mode = options.mode ?? "static";
  const runner = new OpenNavAstroStaticBuildRunner({
    ...options,
    mode,
  });

  return {
    name: "@opennav-ai/opennav/astro",
    hooks: {
      "astro:config:done": (input: OpenNavAstroConfigDoneHookInput): void => {
        runner.captureConfig(input);
      },
      "astro:build:done": async (
        input: OpenNavAstroBuildDoneHookInput,
      ): Promise<void> => {
        const result = await runner.build(input);

        if (result.isOk()) {
          return;
        }

        const message = `${result.error.code}: ${result.error.message}`;
        input.logger.error?.(message);

        throw new Error(message);
      },
    },
  };
}
