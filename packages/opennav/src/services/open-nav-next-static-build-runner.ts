import { isAbsolute, resolve } from "node:path";
import { err, ok, type Result } from "neverthrow";
import { OpenNavStaticSite } from "../index";
import type { OpenNavBuildResult, OpenNavError } from "../types/open-nav-build";
import type {
  OpenNavNextConfig,
  OpenNavNextOptions,
} from "../types/open-nav-next";

/**
 * Runs OpenNav after a Next static export build has produced `out`.
 */
export class OpenNavNextStaticBuildRunner {
  private readonly options: OpenNavNextOptions;

  private buildResultReported = false;

  private nextConfigOutputDirectory: string | undefined;

  /**
   * Stores the OpenNav Next settings for a future static export build.
   *
   * @param options - Site settings and static policy options from
   * `OpenNavNext(...)`.
   */
  public constructor(options: OpenNavNextOptions) {
    this.options = options;
  }

  /**
   * Validates the supplied Next config and registers one post-build hook.
   *
   * @param nextConfig - User's Next config object.
   * @returns A typed success when the hook is registered or intentionally
   * skipped, or a typed OpenNav failure for unsupported config.
   */
  public register(nextConfig: OpenNavNextConfig): Result<void, OpenNavError> {
    if ((this.options.mode ?? "static") !== "static") {
      return err(this.createUnsupportedModeError());
    }

    if (nextConfig.output !== "export") {
      return err(this.createUnsupportedOutputError(nextConfig.output));
    }

    this.nextConfigOutputDirectory =
      this.selectNextConfigOutputDirectory(nextConfig);

    const outputDirectoryResult = this.selectOutputDirectory();

    if (outputDirectoryResult.isErr()) {
      return err(outputDirectoryResult.error);
    }

    if (!this.isNextBuildCommand(process.argv, process.env)) {
      return ok(undefined);
    }

    this.registerBeforeExitBuild();
    this.registerProcessExitBuild();

    return ok(undefined);
  }

  /**
   * Runs the shared static-site SDK against the configured Next export folder.
   *
   * @returns A typed engine report or a typed OpenNav failure.
   */
  public async build(): Promise<Result<OpenNavBuildResult, OpenNavError>> {
    const outputDirectoryResult = this.selectOutputDirectory();

    if (outputDirectoryResult.isErr()) {
      return err(outputDirectoryResult.error);
    }

    const staticSite = new OpenNavStaticSite({
      siteName: this.options.siteName,
      siteUrl: this.options.siteUrl,
      outputDirectory: resolve(outputDirectoryResult.value),
      preset: "next-export",
      ...(this.options.platform === undefined
        ? {}
        : { platform: this.options.platform }),
      accessGuidance: this.options.accessGuidance,
      ...(this.options.staticHeaders === undefined
        ? {}
        : { staticHeaders: this.options.staticHeaders }),
    });

    return await staticSite.build();
  }

  private createUnsupportedModeError(): OpenNavError {
    return {
      code: "OPENNAV_NEXT_STATIC_MODE_REQUIRED",
      message: "OpenNav Next supports only static mode in Phase 1.",
      context: {
        mode: this.options.mode ?? "static",
      },
    };
  }

  private createUnsupportedOutputError(output: unknown): OpenNavError {
    return {
      code: "OPENNAV_NEXT_STATIC_EXPORT_REQUIRED",
      message: 'OpenNav Next static mode requires `output: "export"`.',
      context: {
        output: this.describeConfigValue(output),
      },
    };
  }

  private createAbsoluteOutputDirectoryError(
    source: "outputDirectory" | "distDir",
    outputDirectory: string,
  ): OpenNavError {
    return {
      code: "OPENNAV_NEXT_RELATIVE_OUTPUT_DIRECTORY_REQUIRED",
      message: "OpenNav Next output directories must be relative paths.",
      context: {
        source,
        outputDirectory,
      },
    };
  }

  private selectOutputDirectory(): Result<string, OpenNavError> {
    const outputDirectory =
      this.options.outputDirectory ?? this.nextConfigOutputDirectory ?? "out";

    if (isAbsolute(outputDirectory)) {
      const source =
        this.options.outputDirectory === undefined
          ? "distDir"
          : "outputDirectory";

      return err(
        this.createAbsoluteOutputDirectoryError(source, outputDirectory),
      );
    }

    return ok(outputDirectory);
  }

  private selectNextConfigOutputDirectory(
    nextConfig: OpenNavNextConfig,
  ): string | undefined {
    if (typeof nextConfig.distDir === "string") {
      return nextConfig.distDir;
    }

    return undefined;
  }

  private describeConfigValue(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }

    if (value === undefined) {
      return "undefined";
    }

    const jsonValue = JSON.stringify(value);

    return jsonValue ?? String(value);
  }

  private isNextBuildCommand(
    argv: readonly string[],
    env: NodeJS.ProcessEnv,
  ): boolean {
    if (argv.some((argument: string): boolean => argument === "build")) {
      return true;
    }

    return env.npm_lifecycle_script === "next build";
  }

  private registerBeforeExitBuild(): void {
    process.once("beforeExit", (): void => {
      void this.reportBuildResultOnce();
    });
  }

  private registerProcessExitBuild(): void {
    const originalExit = process.exit.bind(process);

    process.exit = ((code?: string | number | null | undefined): never => {
      void this.reportBuildResultOnce().finally((): never =>
        originalExit(code),
      );

      return undefined as never;
    }) as typeof process.exit;
  }

  private async reportBuildResultOnce(): Promise<void> {
    if (this.buildResultReported) {
      return;
    }

    this.buildResultReported = true;

    const result = await this.build();

    if (result.isErr()) {
      console.error(`${result.error.code}: ${result.error.message}`);
      process.exitCode = 1;
      return;
    }

    console.info(
      `OpenNav wrote ${String(
        result.value.createdFilePaths.length,
      )} files and updated ${String(result.value.modifiedFilePaths.length)} pages.`,
    );

    for (const warning of result.value.warnings) {
      if (warning.code === "ENGINE_FILE_UNSUPPORTED") {
        continue;
      }

      console.warn(`${warning.code}: ${warning.message}`);
    }
  }
}
