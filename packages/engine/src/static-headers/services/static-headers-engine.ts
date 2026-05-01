import { err, ok, type Result } from "neverthrow";
import type { AccessGuidanceFile } from "../../access-guidance/types/access-guidance-file";
import type { OpenNavError } from "../../common/types/opennav-error";
import { EngineFileReader } from "../../input/services/engine-file-reader";
import type {
  EngineStaticHeadersOptions,
  EngineStaticPlatform,
} from "../../types/engine-execute-input";
import type { EngineFilePath } from "../../types/engine-file-path";
import { CloudflarePagesHeadersBuilder } from "./cloudflare-pages-headers-builder";

const CLOUDFLARE_HEADERS_FILE_PATH: EngineFilePath = "_headers";
const SUPPORTED_STATIC_PLATFORMS: readonly EngineStaticPlatform[] = [
  "cloudflare-pages",
];

interface StaticHeadersEngineInput {
  readonly filePaths: readonly EngineFilePath[];
  readonly outputDirectory: string;
  readonly platform?: string | undefined;
  readonly staticHeaders?: EngineStaticHeadersOptions | undefined;
}

interface StaticHeadersEngineBuildInput extends StaticHeadersEngineInput {
  readonly buildFingerprint: string;
}

interface StaticHeadersEngineBuildResult {
  readonly files: readonly AccessGuidanceFile[];
  readonly warnings: readonly OpenNavError[];
}

interface StaticHeadersEngineDependencies {
  readonly cloudflarePagesHeadersBuilder?: CloudflarePagesHeadersBuilder;
  readonly fileReader?: EngineFileReader;
}

/**
 * Plans optional static hosting header artifacts for supported platforms.
 */
export class StaticHeadersEngine {
  readonly #cloudflarePagesHeadersBuilder: CloudflarePagesHeadersBuilder;

  readonly #fileReader: EngineFileReader;

  /**
   * Creates a static headers engine with default platform builders.
   *
   * @param dependencies - Optional collaborators for focused tests.
   */
  public constructor(dependencies: StaticHeadersEngineDependencies = {}) {
    this.#cloudflarePagesHeadersBuilder =
      dependencies.cloudflarePagesHeadersBuilder ??
      new CloudflarePagesHeadersBuilder();
    this.#fileReader = dependencies.fileReader ?? new EngineFileReader();
  }

  /**
   * Removes static header artifact paths from the page/content scan when needed.
   *
   * @param input - Static site output settings and static header options.
   * @returns Content file paths for the normal OpenNav scan, or a typed config error.
   */
  public getContentFilePaths(
    input: StaticHeadersEngineInput,
  ): Result<readonly EngineFilePath[], OpenNavError> {
    const validationResult = this.validate(input);

    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    if (!this.shouldBuildStaticHeaders(input)) {
      return ok(input.filePaths);
    }

    if (input.platform === "cloudflare-pages") {
      return ok(this.removeCloudflarePagesHeadersFilePath(input.filePaths));
    }

    return ok(input.filePaths);
  }

  /**
   * Builds optional static hosting header files for the configured platform.
   *
   * @param input - Static site output settings, build fingerprint, and header options.
   * @returns Planned static header files with non-fatal warnings.
   */
  public async build(
    input: StaticHeadersEngineBuildInput,
  ): Promise<Result<StaticHeadersEngineBuildResult, OpenNavError>> {
    const validationResult = this.validate(input);

    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    if (!this.shouldBuildStaticHeaders(input)) {
      return ok({
        files: [],
        warnings: [],
      });
    }

    if (input.platform === "cloudflare-pages") {
      return await this.buildCloudflarePagesHeaders(input);
    }

    return ok({
      files: [],
      warnings: [],
    });
  }

  private async buildCloudflarePagesHeaders(
    input: StaticHeadersEngineBuildInput,
  ): Promise<Result<StaticHeadersEngineBuildResult, OpenNavError>> {
    const existingContentResult =
      await this.readExistingCloudflareHeadersFile(input);

    if (existingContentResult.isErr()) {
      return err(existingContentResult.error);
    }

    const cloudflarePagesHeadersResult =
      this.#cloudflarePagesHeadersBuilder.build({
        buildFingerprint: input.buildFingerprint,
        existingContent: existingContentResult.value,
      });

    return ok({
      files: cloudflarePagesHeadersResult.files,
      warnings: cloudflarePagesHeadersResult.warnings,
    });
  }

  private createPlatformRequiredError(): OpenNavError {
    return {
      code: "STATIC_HEADERS_PLATFORM_REQUIRED",
      message: "OpenNav needs `platform` when static headers are enabled.",
      context: {
        staticHeaders: {
          enabled: true,
        },
      },
    };
  }

  private createUnsupportedPlatformError(platform: string): OpenNavError {
    return {
      code: "STATIC_HEADERS_PLATFORM_UNSUPPORTED",
      message: `Unsupported static headers platform "${platform}". Supported platforms: ${SUPPORTED_STATIC_PLATFORMS.join(
        ", ",
      )}. Pass a supported platform, or omit platform when you do not need platform-specific artifacts.`,
      context: {
        platform,
        supportedPlatforms: [...SUPPORTED_STATIC_PLATFORMS],
      },
    };
  }

  private hasCloudflareHeadersFilePath(
    filePaths: readonly EngineFilePath[],
  ): boolean {
    return filePaths.some(
      (filePath: EngineFilePath): boolean =>
        filePath === CLOUDFLARE_HEADERS_FILE_PATH,
    );
  }

  private async readExistingCloudflareHeadersFile(
    input: StaticHeadersEngineInput,
  ): Promise<Result<string | undefined, OpenNavError>> {
    if (!this.hasCloudflareHeadersFilePath(input.filePaths)) {
      return ok(undefined);
    }

    const readResult = await this.#fileReader.read({
      outputDirectory: input.outputDirectory,
      filePath: CLOUDFLARE_HEADERS_FILE_PATH,
    });

    if (readResult.isErr()) {
      return err(readResult.error);
    }

    return ok(readResult.value.content);
  }

  private removeCloudflarePagesHeadersFilePath(
    filePaths: readonly EngineFilePath[],
  ): readonly EngineFilePath[] {
    return filePaths.filter(
      (filePath: EngineFilePath): boolean =>
        filePath !== CLOUDFLARE_HEADERS_FILE_PATH,
    );
  }

  private shouldBuildStaticHeaders(input: StaticHeadersEngineInput): boolean {
    return input.staticHeaders?.enabled === true;
  }

  private isSupportedPlatform(
    platform: string,
  ): platform is EngineStaticPlatform {
    return SUPPORTED_STATIC_PLATFORMS.some(
      (supportedPlatform: EngineStaticPlatform): boolean =>
        supportedPlatform === platform,
    );
  }

  private validate(
    input: StaticHeadersEngineInput,
  ): Result<void, OpenNavError> {
    if (input.staticHeaders?.enabled === true && input.platform === undefined) {
      return err(this.createPlatformRequiredError());
    }

    if (
      input.platform !== undefined &&
      !this.isSupportedPlatform(input.platform)
    ) {
      return err(this.createUnsupportedPlatformError(input.platform));
    }

    return ok(undefined);
  }
}
