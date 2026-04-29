import type { EngineExecuteResult, OpenNavError } from "@opennav-ai/engine";
import { err, type Result } from "neverthrow";
import type { OpenNavConfigOptions } from "./types/open-nav-config";
import type { OpenNavStaticSiteBuildOptions } from "./types/open-nav-static-site-build-options";
import type { OpenNavStaticSiteOptions } from "./types/open-nav-static-site-options";

export type { OpenNavError } from "@opennav-ai/engine";
export type { OpenNavAstroOptions } from "./types/open-nav-astro-options";
export type { OpenNavConfigOptions } from "./types/open-nav-config";
export type { OpenNavNextOptions } from "./types/open-nav-next-options";
export type { OpenNavStaticSiteBuildOptions } from "./types/open-nav-static-site-build-options";
export type { OpenNavStaticSiteOptions } from "./types/open-nav-static-site-options";
export type { OpenNavStaticSitePreset } from "./types/open-nav-static-site-preset";

/**
 * Public static-site SDK runner for a built output directory.
 */
export class OpenNavStaticSite {
  private readonly options: OpenNavStaticSiteOptions;

  /**
   * Stores the static-site settings that will be used for a future run.
   *
   * @param options - Site name, public URL, output directory, and optional
   * static policy settings.
   */
  public constructor(options: OpenNavStaticSiteOptions) {
    this.options = options;
  }

  /**
   * Builds OpenNav files and page edits for the configured static output
   * directory.
   *
   * @param options - Optional build settings such as dry-run mode.
   * @returns A typed engine report or a typed OpenNav error.
   */
  public build(
    options: OpenNavStaticSiteBuildOptions = {},
  ): Promise<Result<EngineExecuteResult, OpenNavError>> {
    return Promise.resolve(
      err({
        code: "OPENNAV_STATIC_SITE_NOT_IMPLEMENTED",
        message:
          "OpenNavStaticSite.build is stubbed until static directory scanning is implemented.",
        context: {
          dryRun: options.dryRun === true,
          outputDirectory: this.options.outputDirectory,
        },
      }),
    );
  }
}

/**
 * Returns a shared OpenNav configuration object for config files.
 *
 * @param config - Site settings the CLI can load from an OpenNav config file.
 * @returns The same typed configuration object.
 */
export function OpenNavConfig(
  config: OpenNavConfigOptions,
): OpenNavConfigOptions {
  return config;
}
