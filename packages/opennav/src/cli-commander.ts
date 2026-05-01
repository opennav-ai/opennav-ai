import { Command, CommanderError } from "commander";
import type { Result } from "neverthrow";
import { err, ok, ResultAsync } from "neverthrow";
import { type OpenNavError, OpenNavStaticSite } from "./index";
import type { OpenNavBuildResult } from "./types/open-nav-build";
import type {
  OpenNavStaticHeadersOptions,
  OpenNavStaticPlatform,
  OpenNavStaticSitePreset,
} from "./types/open-nav-static-site";

const SUPPORTED_STATIC_PLATFORMS: readonly OpenNavStaticPlatform[] = [
  "cloudflare-pages",
];

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
    .option("--platform <platform>", "Static hosting platform.")
    .option(
      "--static-headers",
      "Create a static hosting response-header artifact.",
    )
    .option(
      "--strip-layout",
      "Remove documented layout elements before Markdown conversion.",
    )
    .option("--dry-run", "Preview the build without writing files.")
    .action(async (): Promise<void> => {
      const options = buildCommand.opts<{
        readonly static?: boolean | undefined;
        readonly output?: string | undefined;
        readonly siteUrl?: string | undefined;
        readonly siteName?: string | undefined;
        readonly preset?: string | undefined;
        readonly platform?: string | undefined;
        readonly staticHeaders?: boolean | undefined;
        readonly stripLayout?: boolean | undefined;
        readonly dryRun?: boolean | undefined;
      }>();

      validateBuildOptions(options);

      const dryRun = options.dryRun === true;
      const platform = toPlatform(options.platform);
      const staticHeaders = toStaticHeaders(options.staticHeaders);
      const result = await new OpenNavStaticSite({
        siteName: options.siteName,
        siteUrl: options.siteUrl,
        outputDirectory: options.output,
        preset: toPreset(options.preset),
        ...(platform === undefined ? {} : { platform }),
        ...(options.stripLayout === true
          ? { contentExtraction: { stripLayout: true } }
          : {}),
        ...(staticHeaders === undefined ? {} : { staticHeaders }),
      }).build({ dryRun });

      if (result.isOk()) {
        printBuildSummary(result.value, dryRun);
        return;
      }

      throw createCommanderError(result.error.message);
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
  preset: string | undefined,
): OpenNavStaticSitePreset | undefined {
  if (preset === undefined) {
    return undefined;
  }

  if (preset === "astro" || preset === "next-export") {
    return preset;
  }

  throw createCommanderError(
    "argument --preset must be one of: astro, next-export",
  );
}

function toPlatform(
  platform: string | undefined,
): OpenNavStaticPlatform | undefined {
  if (platform === undefined) {
    return undefined;
  }

  if (platform === "cloudflare-pages") {
    return platform;
  }

  throw createUnsupportedPlatformError(platform);
}

function toStaticHeaders(
  enabled: boolean | undefined,
): OpenNavStaticHeadersOptions | undefined {
  if (enabled !== true) {
    return undefined;
  }

  return {
    enabled: true,
  };
}

function validateBuildOptions(options: {
  readonly static?: boolean | undefined;
  readonly output?: string | undefined;
  readonly siteUrl?: string | undefined;
  readonly siteName?: string | undefined;
  readonly preset?: string | undefined;
  readonly platform?: string | undefined;
  readonly staticHeaders?: boolean | undefined;
  readonly stripLayout?: boolean | undefined;
  readonly dryRun?: boolean | undefined;
}): asserts options is {
  readonly static: true;
  readonly output: string;
  readonly siteUrl: string;
  readonly siteName: string;
  readonly preset?: string | undefined;
  readonly platform?: string | undefined;
  readonly staticHeaders?: boolean | undefined;
  readonly stripLayout?: boolean | undefined;
  readonly dryRun?: boolean | undefined;
} {
  if (options.static !== true) {
    throw createCommanderError("Only --static is supported.");
  }

  if (
    options.output === undefined ||
    options.siteUrl === undefined ||
    options.siteName === undefined
  ) {
    throw createCommanderError("Missing required build configuration.");
  }

  if (options.staticHeaders === true && options.platform === undefined) {
    throw createCommanderError(
      "--platform is required when --static-headers is used",
    );
  }
}

function createCommanderError(message: string): CommanderError {
  return new CommanderError(1, "commander.error", `error: ${message}`);
}

function createUnsupportedPlatformError(platform: string): CommanderError {
  return createCommanderError(
    `Unsupported platform "${platform}". Supported platforms: ${SUPPORTED_STATIC_PLATFORMS.join(
      ", ",
    )}. Pass a supported platform with --platform, or omit --platform when you do not need platform-specific artifacts.`,
  );
}
