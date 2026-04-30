import { Command, CommanderError } from "commander";
import type { Result } from "neverthrow";
import { err, ok, ResultAsync } from "neverthrow";
import { type OpenNavError, OpenNavStaticSite } from "./index";
import type { OpenNavBuildResult } from "./types/open-nav-build-result";
import type { OpenNavStaticSitePreset } from "./types/open-nav-static-site-preset";

/**
 * Creates the Commander program used by the OpenNav executable.
 *
 * @returns A Commander program with the `build` command configured.
 */
export function createOpenNavCommand(): Command {
  const program = new Command();
  const buildCommand = new Command("build");

  program.name("opennav").description("Build OpenNav static site artifacts.");

  buildCommand
    .description("Build OpenNav files for a static output directory.")
    .option("--static", "Run the static-site build.")
    .requiredOption("--output <directory>", "Built static output directory.")
    .requiredOption("--site-url <url>", "Public absolute site URL.")
    .requiredOption("--site-name <name>", "Human-readable site name.")
    .option("--preset <preset>", "Static framework preset.")
    .option("--dry-run", "Preview the build without writing files.")
    .action(async (): Promise<void> => {
      const options = buildCommand.opts<{
        readonly static?: boolean | undefined;
        readonly output?: string | undefined;
        readonly siteUrl?: string | undefined;
        readonly siteName?: string | undefined;
        readonly preset?: string | undefined;
        readonly dryRun?: boolean | undefined;
      }>();

      validateBuildOptions(buildCommand, options);

      const dryRun = options.dryRun === true;
      const result = await new OpenNavStaticSite({
        siteName: options.siteName,
        siteUrl: options.siteUrl,
        outputDirectory: options.output,
        preset: toPreset(buildCommand, options.preset),
      }).build({ dryRun });

      if (result.isOk()) {
        printBuildSummary(result.value, dryRun);
        return;
      }

      buildCommand.error(result.error.message);
    });

  program.addCommand(buildCommand);

  return program;
}

/**
 * Runs the OpenNav CLI with process-style arguments.
 *
 * @param argv - Full command-line arguments including executable and script.
 * @returns A typed result describing whether the command completed.
 */
export async function runOpenNavCli(
  argv: readonly string[],
): Promise<Result<void, OpenNavError>> {
  if (argv.length < 3) {
    return err({
      code: "OPENNAV_CLI_COMMAND_REQUIRED",
      message: "OpenNav requires a command. Run `opennav build`.",
      context: {},
    });
  }

  const program = createOpenNavCommand();
  program.exitOverride();

  const parseResult = await ResultAsync.fromPromise(
    program.parseAsync([...argv]),
    (cause: unknown): unknown => cause,
  );

  if (parseResult.isErr()) {
    if (isCommanderSuccessExit(parseResult.error)) {
      return ok(undefined);
    }

    return err(toCliError(parseResult.error));
  }

  return ok(undefined);
}

function printBuildSummary(result: OpenNavBuildResult, dryRun: boolean): void {
  console.log(
    [
      dryRun
        ? "OpenNav build completed (dry-run)."
        : "OpenNav build completed.",
      `Created: ${result.createdFilePaths.length}`,
      `Modified: ${result.modifiedFilePaths.length}`,
      `Skipped: ${result.skippedFilePaths.length}`,
      `Warnings: ${result.warnings.length}`,
    ].join("\n"),
  );
}

function toCliError(cause: unknown): OpenNavError {
  if (cause instanceof CommanderError) {
    return {
      code: "OPENNAV_CLI_COMMAND_FAILED",
      message: cause.message,
      context: {
        commanderCode: cause.code,
      },
    };
  }

  if (cause instanceof Error) {
    return {
      code: "OPENNAV_CLI_COMMAND_FAILED",
      message: cause.message,
      context: {},
    };
  }

  return {
    code: "OPENNAV_CLI_COMMAND_FAILED",
    message: String(cause),
    context: {},
  };
}

function isCommanderSuccessExit(cause: unknown): boolean {
  return cause instanceof CommanderError && cause.exitCode === 0;
}

function toPreset(
  command: Command,
  preset: string | undefined,
): OpenNavStaticSitePreset | undefined {
  if (preset === undefined) {
    return undefined;
  }

  if (preset === "astro" || preset === "next-export") {
    return preset;
  }

  command.error("argument --preset must be one of: astro, next-export");
}

function validateBuildOptions(
  command: Command,
  options: {
    readonly static?: boolean | undefined;
    readonly output?: string | undefined;
    readonly siteUrl?: string | undefined;
    readonly siteName?: string | undefined;
    readonly preset?: string | undefined;
    readonly dryRun?: boolean | undefined;
  },
): asserts options is {
  readonly static: true;
  readonly output: string;
  readonly siteUrl: string;
  readonly siteName: string;
  readonly preset?: string | undefined;
  readonly dryRun?: boolean | undefined;
} {
  if (options.static !== true) {
    command.error("Only --static is supported.");
  }

  if (
    options.output === undefined ||
    options.siteUrl === undefined ||
    options.siteName === undefined
  ) {
    command.error("Missing required build configuration.");
  }
}
