import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import {
  Engine,
  type EngineExecuteResult,
  type EngineFilePath,
  type OpenNavError,
} from "@opennav-ai/engine";
import { err, ok, type Result, ResultAsync } from "neverthrow";
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
  public async build(
    options: OpenNavStaticSiteBuildOptions = {},
  ): Promise<Result<EngineExecuteResult, OpenNavError>> {
    const filePathsResult = await this.collectFilePaths(
      this.options.outputDirectory,
      this.options.outputDirectory,
    );

    if (filePathsResult.isErr()) {
      return err(filePathsResult.error);
    }

    return await Engine.execute(
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
  }

  private async collectFilePaths(
    outputDirectory: string,
    directory: string,
  ): Promise<Result<readonly EngineFilePath[], OpenNavError>> {
    const entriesResult = await ResultAsync.fromPromise(
      readdir(directory, { withFileTypes: true }),
      (cause: unknown): OpenNavError =>
        this.createDirectoryReadError(outputDirectory, directory, cause),
    );

    if (entriesResult.isErr()) {
      return err(entriesResult.error);
    }

    const filePaths: EngineFilePath[] = [];
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
      filePaths.sort((first: EngineFilePath, second: EngineFilePath): number =>
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
  ): EngineFilePath {
    return relative(outputDirectory, absoluteFilePath)
      .split(sep)
      .join("/") as EngineFilePath;
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
