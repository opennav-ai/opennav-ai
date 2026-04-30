import { fileURLToPath } from "node:url";
import { err, ok, type Result } from "neverthrow";
import { OpenNavStaticSite } from "../index";
import type {
  OpenNavAstroBuildDoneHookInput,
  OpenNavAstroConfigDoneHookInput,
  OpenNavAstroOptions,
} from "../types/open-nav-astro";
import type { OpenNavBuildResult, OpenNavError } from "../types/open-nav-build";

/**
 * Runs OpenNav for Astro static builds using the shared static-site SDK.
 */
export class OpenNavAstroStaticBuildRunner {
  private readonly options: OpenNavAstroOptions;

  private astroSiteUrl: string | undefined;

  private astroBuildOutput: "server" | "static" | undefined;

  /**
   * Stores the OpenNav Astro integration options for later build hooks.
   *
   * @param options - Site settings and static policy options from
   * `OpenNavAstro(...)`.
   */
  public constructor(options: OpenNavAstroOptions) {
    this.options = options;
  }

  /**
   * Captures Astro config values needed after the output folder exists.
   *
   * @param input - Resolved Astro config hook input.
   * @returns Nothing; values are stored for the later build-done hook.
   */
  public captureConfig(input: OpenNavAstroConfigDoneHookInput): void {
    this.astroSiteUrl = input.config.site;
    this.astroBuildOutput = input.buildOutput;
  }

  /**
   * Runs the static-site SDK against Astro's generated output directory.
   *
   * @param input - Astro build-done hook input with the emitted output `dir`.
   * @returns A typed engine report or a typed OpenNav failure.
   */
  public async build(
    input: OpenNavAstroBuildDoneHookInput,
  ): Promise<Result<OpenNavBuildResult, OpenNavError>> {
    if (this.astroBuildOutput === "server") {
      return err(this.createServerOutputError());
    }

    if (input.dir.protocol !== "file:") {
      return err(this.createOutputDirectoryUrlError(input.dir));
    }

    const siteUrl = this.options.siteUrl ?? this.astroSiteUrl;

    if (siteUrl === undefined || siteUrl.trim().length === 0) {
      return err(this.createMissingSiteUrlError());
    }

    const staticSite = new OpenNavStaticSite({
      siteName: this.options.siteName,
      siteUrl,
      outputDirectory: fileURLToPath(input.dir),
      preset: "astro",
      accessGuidance: this.options.accessGuidance,
    });
    const result = await staticSite.build();

    if (result.isErr()) {
      return err(result.error);
    }

    this.reportSuccessfulBuild(input, result.value);

    return ok(result.value);
  }

  private createMissingSiteUrlError(): OpenNavError {
    return {
      code: "OPENNAV_ASTRO_SITE_URL_MISSING",
      message:
        "OpenNav Astro needs either `siteUrl` or Astro's top-level `site` config value.",
      context: {
        siteName: this.options.siteName,
      },
    };
  }

  private createOutputDirectoryUrlError(dir: URL): OpenNavError {
    return {
      code: "OPENNAV_ASTRO_OUTPUT_DIRECTORY_URL_INVALID",
      message: "OpenNav Astro received a non-file output directory URL.",
      context: {
        dir: dir.toString(),
      },
    };
  }

  private createServerOutputError(): OpenNavError {
    return {
      code: "OPENNAV_ASTRO_STATIC_OUTPUT_REQUIRED",
      message: "OpenNav Astro static mode requires an Astro static build.",
      context: {
        buildOutput: this.astroBuildOutput,
        mode: this.options.mode ?? "static",
      },
    };
  }

  private reportSuccessfulBuild(
    input: OpenNavAstroBuildDoneHookInput,
    result: OpenNavBuildResult,
  ): void {
    input.logger.info?.(
      `OpenNav wrote ${String(
        result.createdFilePaths.length,
      )} files and updated ${String(result.modifiedFilePaths.length)} pages.`,
    );

    for (const warning of result.warnings) {
      input.logger.warn?.(`${warning.code}: ${warning.message}`);
    }
  }
}
