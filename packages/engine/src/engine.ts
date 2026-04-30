import { err, ok, type Result } from "neverthrow";
import { AccessGuidanceBuilder } from "./access-guidance/services/access-guidance-builder";
import type { RobotsTxtSourceFile } from "./access-guidance/types/robots-txt-source-file";
import { DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS } from "./agent-content/constants/default-llms-full-max-content-tokens";
import { AgentContentFileBuilder } from "./agent-content/services/agent-content-file-builder";
import type { AgentContentBuildPage } from "./agent-content/types/agent-content-build-page";
import { BuildFingerprintBuilder } from "./build-fingerprint/services/build-fingerprint-builder";
import type { BuildFingerprintFileInput } from "./build-fingerprint/types/build-fingerprint-file-input";
import type { OpenNavError } from "./common/types/opennav-error";
import { DistFileWriter } from "./dist-write/services/dist-file-writer";
import { EngineFileListReader } from "./input/services/engine-file-list-reader";
import { EngineFileReader } from "./input/services/engine-file-reader";
import type { EngineFile } from "./input/types/engine-file";
import type { EngineFileReference } from "./input/types/engine-file-reference";
import { FileMetadataReader } from "./pages/services/file-metadata-reader";
import type { OpenNavPageMetadata } from "./pages/types/opennav-page";
import { BuildResultReporter } from "./reporting/services/build-result-reporter";
import { ResourceLinkBuilder } from "./resource-links/services/resource-link-builder";
import type { ResourceLinkBuildPage } from "./resource-links/types/resource-link-build-page";
import { OpenNavSiteValidator } from "./site-validation/services/opennav-site-validator";
import type { EngineAccessGuidanceOptions } from "./types/engine-access-guidance-options";
import type { EngineContentSignalPermission } from "./types/engine-content-signal-permission";
import type { EngineExecuteInput } from "./types/engine-execute-input";
import type { EngineExecuteOptions } from "./types/engine-execute-options";
import type { EngineExecuteResult } from "./types/engine-execute-result";
import type { EngineFilePath } from "./types/engine-file-path";
import { WritePlanBuilder } from "./write-plan/services/write-plan-builder";

interface SourceFilesForPlanning {
  readonly fingerprintFiles: readonly BuildFingerprintFileInput[];
  readonly sourceFiles: readonly EngineFile[];
}

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

    const sourceFilesResult = await Engine.readSourceFilesForPlanning({
      outputDirectory: input.outputDirectory,
      fileReferences: fileListResult.value.fileReferences,
      fileReader,
      buildFingerprintBuilder,
    });

    if (sourceFilesResult.isErr()) {
      return err(sourceFilesResult.error);
    }

    const sourceFilesForPlanning = Engine.filterSourceFilesForPlanning(
      sourceFilesResult.value,
    );
    const fileMetadataResult = await fileMetadataReader.read({
      baseUrl: input.baseUrl,
      files: sourceFilesForPlanning.sourceFiles,
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
      sourceFiles: sourceFilesForPlanning.fingerprintFiles,
      contentSignals: Engine.serializeContentSignals(input.accessGuidance),
    });

    const agentContentResult = agentContentFileBuilder.build({
      siteName: input.siteName,
      baseUrl: input.baseUrl,
      buildFingerprint,
      contentSignalsConfigured:
        input.accessGuidance?.contentSignals !== undefined,
      maxLlmsFullContentTokens: DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS,
      pages: fileMetadataResult.value.pageMetadata.map(
        (page: OpenNavPageMetadata): AgentContentBuildPage => ({
          page,
          getSourceContent: async (): Promise<Result<string, OpenNavError>> =>
            Engine.readPageSourceContent({
              sourceFiles: sourceFilesForPlanning.sourceFiles,
              sourceFilePath: page.sourceFilePath,
            }),
        }),
      ),
    });

    const resourceLinkPagesResult = Engine.createResourceLinkPages({
      pages: fileMetadataResult.value.pageMetadata,
      sourceFiles: sourceFilesForPlanning.sourceFiles,
    });

    if (resourceLinkPagesResult.isErr()) {
      return err(resourceLinkPagesResult.error);
    }

    const resourceLinkResult = resourceLinkBuilder.build({
      baseUrl: input.baseUrl,
      buildFingerprint,
      pages: resourceLinkPagesResult.value,
    });
    const accessGuidanceResult = accessGuidanceBuilder.build({
      buildFingerprint,
      robotsTxtFile: Engine.findRobotsTxtSourceFile(
        sourceFilesForPlanning.sourceFiles,
      ),
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

  private static createSourceFileMissingError(
    sourceFilePath: EngineFilePath,
  ): OpenNavError {
    return {
      code: "ENGINE_SOURCE_FILE_MISSING",
      message: "The engine could not find source content for a planned page.",
      context: {
        sourceFilePath,
      },
    };
  }

  private static createResourceLinkPages(input: {
    readonly pages: readonly OpenNavPageMetadata[];
    readonly sourceFiles: readonly EngineFile[];
  }): Result<readonly ResourceLinkBuildPage[], OpenNavError> {
    const buildPages: ResourceLinkBuildPage[] = [];

    for (const page of input.pages) {
      const sourceFile = Engine.findSourceFile(
        input.sourceFiles,
        page.sourceFilePath,
      );

      if (sourceFile === undefined) {
        return err(Engine.createSourceFileMissingError(page.sourceFilePath));
      }

      buildPages.push({
        page,
        sourceContent: sourceFile.content,
      });
    }

    return ok(buildPages);
  }

  private static filterSourceFilesForPlanning(
    input: SourceFilesForPlanning,
  ): SourceFilesForPlanning {
    const sourceFiles = input.sourceFiles.filter(
      (sourceFile: EngineFile): boolean =>
        !Engine.isOpenNavManagedMarkdownSourceFile(sourceFile),
    );
    const sourceFilePaths = new Set(
      sourceFiles.map(
        (sourceFile: EngineFile): EngineFilePath => sourceFile.filePath,
      ),
    );

    return {
      sourceFiles,
      fingerprintFiles: input.fingerprintFiles.filter(
        (fingerprintFile: BuildFingerprintFileInput): boolean =>
          sourceFilePaths.has(fingerprintFile.filePath),
      ),
    };
  }

  private static isOpenNavManagedMarkdownSourceFile(
    sourceFile: EngineFile,
  ): boolean {
    return (
      sourceFile.kind === "markdown" &&
      sourceFile.content.includes('opennav compatible="true"') &&
      sourceFile.content.includes('manifest="/.well-known/opennav.json"')
    );
  }

  private static findRobotsTxtSourceFile(
    sourceFiles: readonly EngineFile[],
  ): RobotsTxtSourceFile | undefined {
    const robotsTxtFile = sourceFiles.find(
      (sourceFile: EngineFile): boolean => sourceFile.kind === "robots",
    );

    if (robotsTxtFile === undefined) {
      return undefined;
    }

    return {
      filePath: robotsTxtFile.filePath,
      content: robotsTxtFile.content,
    };
  }

  private static findSourceFile(
    sourceFiles: readonly EngineFile[],
    sourceFilePath: EngineFilePath,
  ): EngineFile | undefined {
    return sourceFiles.find(
      (sourceFile: EngineFile): boolean =>
        sourceFile.filePath === sourceFilePath,
    );
  }

  private static formatContentSignalPermission(
    permission: EngineContentSignalPermission,
  ): string {
    if (permission === "allow") {
      return "yes";
    }

    return "no";
  }

  private static async readPageSourceContent(input: {
    readonly sourceFiles: readonly EngineFile[];
    readonly sourceFilePath: EngineFilePath;
  }): Promise<Result<string, OpenNavError>> {
    const sourceFile = Engine.findSourceFile(
      input.sourceFiles,
      input.sourceFilePath,
    );

    if (sourceFile === undefined) {
      return err(Engine.createSourceFileMissingError(input.sourceFilePath));
    }

    return ok(sourceFile.content);
  }

  private static async readSourceFilesForPlanning(input: {
    readonly outputDirectory: string;
    readonly fileReferences: readonly EngineFileReference[];
    readonly fileReader: EngineFileReader;
    readonly buildFingerprintBuilder: BuildFingerprintBuilder;
  }): Promise<Result<SourceFilesForPlanning, OpenNavError>> {
    const sourceFiles: EngineFile[] = [];
    const fingerprintFiles: BuildFingerprintFileInput[] = [];

    for (const fileReference of input.fileReferences) {
      const readResult = await input.fileReader.read({
        outputDirectory: input.outputDirectory,
        filePath: fileReference.filePath,
      });

      if (readResult.isErr()) {
        return err(readResult.error);
      }

      sourceFiles.push(readResult.value);
      fingerprintFiles.push({
        filePath: readResult.value.filePath,
        contentFingerprint:
          input.buildFingerprintBuilder.buildContentFingerprint({
            content: readResult.value.content,
            sourceContentKind: readResult.value.kind,
          }),
      });
    }

    return ok({
      sourceFiles,
      fingerprintFiles,
    });
  }

  private static serializeContentSignals(
    accessGuidance: EngineAccessGuidanceOptions | undefined,
  ): readonly string[] | undefined {
    const contentSignals = accessGuidance?.contentSignals;

    if (contentSignals === undefined) {
      return undefined;
    }

    const serializedSignals: string[] = [];

    if (contentSignals.search !== undefined) {
      serializedSignals.push(
        `search=${Engine.formatContentSignalPermission(contentSignals.search)}`,
      );
    }

    if (contentSignals.aiInput !== undefined) {
      serializedSignals.push(
        `ai-input=${Engine.formatContentSignalPermission(
          contentSignals.aiInput,
        )}`,
      );
    }

    if (contentSignals.aiTrain !== undefined) {
      serializedSignals.push(
        `ai-train=${Engine.formatContentSignalPermission(
          contentSignals.aiTrain,
        )}`,
      );
    }

    return serializedSignals;
  }
}
