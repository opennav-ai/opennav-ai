import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { Engine } from "#opennav-engine";
import type { OpenNavBuildResult } from "./types/open-nav-build-result";
import type { OpenNavConfigOptions } from "./types/open-nav-config";
import type { OpenNavError } from "./types/open-nav-error";
import type { OpenNavOutputFilePath } from "./types/open-nav-output-file-path";
import type { OpenNavStaticSiteBuildOptions } from "./types/open-nav-static-site-build-options";
import type { OpenNavStaticSiteOptions } from "./types/open-nav-static-site-options";

export type { OpenNavAccessGuidanceOptions } from "./types/open-nav-access-guidance-options";
export type { OpenNavAstroOptions } from "./types/open-nav-astro-options";
export type { OpenNavBuildResult } from "./types/open-nav-build-result";
export type { OpenNavConfigOptions } from "./types/open-nav-config";
export type { OpenNavContentSignalPermission } from "./types/open-nav-content-signal-permission";
export type { OpenNavContentSignalsPolicy } from "./types/open-nav-content-signals-policy";
export type { OpenNavError } from "./types/open-nav-error";
export type { OpenNavNextOptions } from "./types/open-nav-next-options";
export type { OpenNavOutputFilePath } from "./types/open-nav-output-file-path";
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
   * @returns A typed build report or a typed OpenNav error.
   */
  public async build(
    options: OpenNavStaticSiteBuildOptions = {},
  ): Promise<Result<OpenNavBuildResult, OpenNavError>> {
    const filePathsResult = await this.collectFilePaths(
      this.options.outputDirectory,
      this.options.outputDirectory,
    );

    if (filePathsResult.isErr()) {
      return err(filePathsResult.error);
    }

    const result = await Engine.execute(
      {
        siteName: this.options.siteName,
        baseUrl: this.options.siteUrl,
        outputDirectory: this.options.outputDirectory,
        filePaths: filePathsResult.value,
        accessGuidance: this.options.accessGuidance,
      },
      {
        dryRun: options.dryRun === true,
      },
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value);
  }

  private async collectFilePaths(
    outputDirectory: string,
    directory: string,
  ): Promise<Result<readonly OpenNavOutputFilePath[], OpenNavError>> {
    const entriesResult = await ResultAsync.fromPromise(
      readdir(directory, { withFileTypes: true }),
      (cause: unknown): OpenNavError =>
        this.createDirectoryReadError(outputDirectory, directory, cause),
    );

    if (entriesResult.isErr()) {
      return err(entriesResult.error);
    }

    const filePaths: OpenNavOutputFilePath[] = [];
    const entries = [...entriesResult.value].sort(
      (first: Dirent, second: Dirent): number =>
        first.name.localeCompare(second.name),
    );

    for (const entry of entries) {
      const absoluteFilePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        const nestedFilePathsResult = await this.collectFilePaths(
          outputDirectory,
          absoluteFilePath,
        );

        if (nestedFilePathsResult.isErr()) {
          return err(nestedFilePathsResult.error);
        }

        filePaths.push(...nestedFilePathsResult.value);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      filePaths.push(this.toOutputFilePath(outputDirectory, absoluteFilePath));
    }

    return ok(
      filePaths.sort(
        (first: OpenNavOutputFilePath, second: OpenNavOutputFilePath): number =>
          first.localeCompare(second),
      ),
    );
  }

  private createDirectoryReadError(
    outputDirectory: string,
    directory: string,
    cause: unknown,
  ): OpenNavError {
    return {
      code: "OPENNAV_STATIC_SITE_DIRECTORY_READ_FAILED",
      message: "OpenNav could not read the static output directory.",
      context: {
        outputDirectory,
        directory,
        cause: this.describeCause(cause),
      },
    };
  }

  private describeCause(cause: unknown): string {
    if (cause instanceof Error) {
      return cause.message;
    }

    return String(cause);
  }

  private toOutputFilePath(
    outputDirectory: string,
    absoluteFilePath: string,
  ): OpenNavOutputFilePath {
    return relative(outputDirectory, absoluteFilePath)
      .split(sep)
      .join("/") as OpenNavOutputFilePath;
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
