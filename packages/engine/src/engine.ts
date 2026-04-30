import { err, ok, type Result } from "neverthrow";
import { AccessGuidanceBuilder } from "./access-guidance/services/access-guidance-builder";
import { ContentSignalsGuidanceBuilder } from "./access-guidance/services/content-signals-guidance-builder";
import type { RobotsTxtSourceFile } from "./access-guidance/types/robots-txt-source-file";
import { DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS } from "./agent-content/constants/default-llms-full-max-content-tokens";
import { AgentContentFileBuilder } from "./agent-content/services/agent-content-file-builder";
import type { AgentContentBuildPage } from "./agent-content/types/agent-content-build-page";
import { BuildFingerprintBuilder } from "./build-fingerprint/services/build-fingerprint-builder";
import type { OpenNavError } from "./common/types/opennav-error";
import { DistFileWriter } from "./dist-write/services/dist-file-writer";
import { EngineFileListReader } from "./input/services/engine-file-list-reader";
import { EngineFileReader } from "./input/services/engine-file-reader";
import type { EngineFileReference } from "./input/types/engine-file-reference";
import { FileMetadataReader } from "./pages/services/file-metadata-reader";
import type { OpenNavPageMetadata } from "./pages/types/opennav-page";
import { BuildResultReporter } from "./reporting/services/build-result-reporter";
import { ResourceLinkBuilder } from "./resource-links/services/resource-link-builder";
import type { ResourceLinkBuildPage } from "./resource-links/types/resource-link-build-page";
import { OpenNavSiteValidator } from "./site-validation/services/opennav-site-validator";
import type { EngineExecuteInput } from "./types/engine-execute-input";
import type { EngineExecuteOptions } from "./types/engine-execute-options";
import type { EngineExecuteResult } from "./types/engine-execute-result";
import type { EngineFilePath } from "./types/engine-file-path";
import { WritePlanBuilder } from "./write-plan/services/write-plan-builder";

/**
 * Public OpenNav AI engine entrypoint.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Phase 1 intentionally exposes Engine.execute(...) as the public API.
export class Engine {
  /**
   * Executes OpenNav AI against a built static site output directory.
   *
   * @param input - Site settings, output directory, and built file paths to process.
   * @param options - Optional execution settings such as dry-run mode.
   * @returns A typed result containing the execution report or a typed OpenNav AI error.
   */
  public static async execute(
    input: EngineExecuteInput,
    options: EngineExecuteOptions = {},
  ): Promise<Result<EngineExecuteResult, OpenNavError>> {
    const fileListReader = new EngineFileListReader();
    const fileMetadataReader = new FileMetadataReader();
    const siteValidator = new OpenNavSiteValidator();
    const fileReader = new EngineFileReader();
    const buildFingerprintBuilder = new BuildFingerprintBuilder();
    const agentContentFileBuilder = new AgentContentFileBuilder();
    const resourceLinkBuilder = new ResourceLinkBuilder();
    const accessGuidanceBuilder = new AccessGuidanceBuilder();
    const contentSignalsGuidanceBuilder = new ContentSignalsGuidanceBuilder();
    const writePlanBuilder = new WritePlanBuilder();
    const distFileWriter = new DistFileWriter();
    const buildResultReporter = new BuildResultReporter();
    const fileListResult = await fileListReader.read({
      outputDirectory: input.outputDirectory,
      filePaths: input.filePaths,
    });

    if (fileListResult.isErr()) {
      return err(fileListResult.error);
    }

    const fileMetadataResult = await fileMetadataReader.read({
      baseUrl: input.baseUrl,
      outputDirectory: input.outputDirectory,
      fileReferences: fileListResult.value.fileReferences,
    });

    if (fileMetadataResult.isErr()) {
      return err(fileMetadataResult.error);
    }

    const validationResult = siteValidator.validate({
      siteName: input.siteName,
      baseUrl: input.baseUrl,
      pages: fileMetadataResult.value.pageMetadata,
      mode: "strict",
    });

    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    const buildFingerprint = buildFingerprintBuilder.buildBuildFingerprint({
      siteName: input.siteName,
      baseUrl: input.baseUrl,
      sourceFiles: fileMetadataResult.value.fingerprintFiles,
      contentSignals: contentSignalsGuidanceBuilder.buildFingerprintSignals({
        contentSignals: input.accessGuidance?.contentSignals,
      }),
    });

    const agentContentResult = agentContentFileBuilder.build({
      siteName: input.siteName,
      baseUrl: input.baseUrl,
      buildFingerprint,
      contentSignalsConfigured:
        contentSignalsGuidanceBuilder.hasConfiguredSignals({
          contentSignals: input.accessGuidance?.contentSignals,
        }),
      maxLlmsFullContentTokens: DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS,
      pages: fileMetadataResult.value.pageMetadata.map(
        (page: OpenNavPageMetadata): AgentContentBuildPage => ({
          page,
          getSourceContent: async (): Promise<Result<string, OpenNavError>> =>
            Engine.readPageSourceContent({
              outputDirectory: input.outputDirectory,
              fileReader,
              sourceFilePath: page.sourceFilePath,
            }),
        }),
      ),
    });

    const resourceLinkPagesResult = await Engine.createResourceLinkPages({
      outputDirectory: input.outputDirectory,
      pages: fileMetadataResult.value.pageMetadata,
      fileReader,
    });

    if (resourceLinkPagesResult.isErr()) {
      return err(resourceLinkPagesResult.error);
    }

    const resourceLinkResult = resourceLinkBuilder.build({
      baseUrl: input.baseUrl,
      buildFingerprint,
      pages: resourceLinkPagesResult.value,
    });
    const robotsTxtSourceFileResult = await Engine.findRobotsTxtSourceFile({
      outputDirectory: input.outputDirectory,
      sourceFileReferences: fileMetadataResult.value.sourceFileReferences,
      fileReader,
    });

    if (robotsTxtSourceFileResult.isErr()) {
      return err(robotsTxtSourceFileResult.error);
    }

    const accessGuidanceResult = accessGuidanceBuilder.build({
      buildFingerprint,
      robotsTxtFile: robotsTxtSourceFileResult.value,
      contentSignals: input.accessGuidance?.contentSignals,
    });
    const writePlanResult = await writePlanBuilder.build({
      outputDirectory: input.outputDirectory,
      generatedFiles: agentContentResult.files,
      pageEdits: resourceLinkResult.pageEdits,
      accessGuidanceFiles: accessGuidanceResult.files,
    });

    if (writePlanResult.isErr()) {
      return err(writePlanResult.error);
    }

    const skippedFilePaths = [
      ...fileListResult.value.skippedFilePaths,
      ...agentContentResult.skippedFilePaths,
    ];
    const warnings = [
      ...fileListResult.value.warnings,
      ...validationResult.value.warnings,
      ...agentContentResult.warnings,
      ...resourceLinkResult.warnings,
      ...accessGuidanceResult.warnings,
      ...writePlanResult.value.warnings,
    ];

    if (options.dryRun === true) {
      return buildResultReporter.reportDryRun({
        writePlan: writePlanResult.value.plan,
        skippedFilePaths,
        warnings,
      });
    }

    const writeResult = await distFileWriter.write({
      outputDirectory: input.outputDirectory,
      plan: writePlanResult.value.plan,
    });

    if (writeResult.isErr()) {
      return err(writeResult.error);
    }

    return buildResultReporter.reportWrite({
      records: writeResult.value.records,
      skippedFilePaths,
      warnings: [...warnings, ...writeResult.value.warnings],
    });
  }

  private static async createResourceLinkPages(input: {
    readonly outputDirectory: string;
    readonly pages: readonly OpenNavPageMetadata[];
    readonly fileReader: EngineFileReader;
  }): Promise<Result<readonly ResourceLinkBuildPage[], OpenNavError>> {
    const buildPages: ResourceLinkBuildPage[] = [];

    for (const page of input.pages) {
      if (page.sourceContentType !== "html") {
        continue;
      }

      const sourceContentResult = await Engine.readPageSourceContent({
        outputDirectory: input.outputDirectory,
        fileReader: input.fileReader,
        sourceFilePath: page.sourceFilePath,
      });

      if (sourceContentResult.isErr()) {
        return err(sourceContentResult.error);
      }

      buildPages.push({
        page,
        sourceContent: sourceContentResult.value,
      });
    }

    return ok(buildPages);
  }

  private static async findRobotsTxtSourceFile(input: {
    readonly outputDirectory: string;
    readonly sourceFileReferences: readonly EngineFileReference[];
    readonly fileReader: EngineFileReader;
  }): Promise<Result<RobotsTxtSourceFile | undefined, OpenNavError>> {
    const robotsTxtFile = input.sourceFileReferences.find(
      (sourceFile: EngineFileReference): boolean =>
        sourceFile.kind === "robots",
    );

    if (robotsTxtFile === undefined) {
      return ok(undefined);
    }

    const readResult = await input.fileReader.read({
      outputDirectory: input.outputDirectory,
      filePath: robotsTxtFile.filePath,
    });

    if (readResult.isErr()) {
      return err(readResult.error);
    }

    return ok({
      filePath: readResult.value.filePath,
      content: readResult.value.content,
    });
  }

  private static async readPageSourceContent(input: {
    readonly outputDirectory: string;
    readonly fileReader: EngineFileReader;
    readonly sourceFilePath: EngineFilePath;
  }): Promise<Result<string, OpenNavError>> {
    const readResult = await input.fileReader.read({
      outputDirectory: input.outputDirectory,
      filePath: input.sourceFilePath,
    });

    if (readResult.isErr()) {
      return err(readResult.error);
    }

    return ok(readResult.value.content);
  }
}
