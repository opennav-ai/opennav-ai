import { err, type Result } from "neverthrow";
import { AccessGuidanceBuilder } from "./access-guidance/services/access-guidance-builder";
import { ContentSignalsGuidanceBuilder } from "./access-guidance/services/content-signals-guidance-builder";
import { DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS } from "./agent-content/constants/default-llms-full-max-content-tokens";
import { AgentContentFileBuilder } from "./agent-content/services/agent-content-file-builder";
import { BuildFingerprintBuilder } from "./build-fingerprint/services/build-fingerprint-builder";
import type { OpenNavError } from "./common/types/opennav-error";
import { DistFileWriter } from "./dist-write/services/dist-file-writer";
import { EngineFileListReader } from "./input/services/engine-file-list-reader";
import { FileMetadataReader } from "./pages/services/file-metadata-reader";
import { BuildResultReporter } from "./reporting/services/build-result-reporter";
import { ResourceLinkBuilder } from "./resource-links/services/resource-link-builder";
import { OpenNavSiteValidator } from "./site-validation/services/opennav-site-validator";
import { SiteBaseUrlNormalizer } from "./site-validation/services/site-base-url-normalizer";
import { StaticHeadersEngine } from "./static-headers/services/static-headers-engine";
import type { EngineExecuteInput } from "./types/engine-execute-input";
import type { EngineExecuteOptions } from "./types/engine-execute-options";
import type { EngineExecuteResult } from "./types/engine-execute-result";
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
    const siteBaseUrlNormalizer = new SiteBaseUrlNormalizer();
    const normalizedBaseUrlResult = siteBaseUrlNormalizer.normalize(
      input.baseUrl,
    );

    if (normalizedBaseUrlResult.isErr()) {
      return err(normalizedBaseUrlResult.error);
    }

    const baseUrl = normalizedBaseUrlResult.value.baseUrl;
    const staticHeadersEngine = new StaticHeadersEngine();
    const contentFilePathsResult = staticHeadersEngine.getContentFilePaths({
      outputDirectory: input.outputDirectory,
      filePaths: input.filePaths,
      platform: input.platform,
      staticHeaders: input.staticHeaders,
    });

    if (contentFilePathsResult.isErr()) {
      return err(contentFilePathsResult.error);
    }

    const fileListReader = new EngineFileListReader();
    const fileMetadataReader = new FileMetadataReader();
    const siteValidator = new OpenNavSiteValidator();
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
      filePaths: contentFilePathsResult.value,
    });

    if (fileListResult.isErr()) {
      return err(fileListResult.error);
    }

    const fileMetadataResult = await fileMetadataReader.read({
      baseUrl,
      outputDirectory: input.outputDirectory,
      fileReferences: fileListResult.value.fileReferences,
    });

    if (fileMetadataResult.isErr()) {
      return err(fileMetadataResult.error);
    }

    const validationResult = siteValidator.validate({
      siteName: input.siteName,
      baseUrl,
      pages: fileMetadataResult.value.pageMetadata,
      mode: "strict",
    });

    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    const buildFingerprint = buildFingerprintBuilder.buildBuildFingerprint({
      siteName: input.siteName,
      baseUrl,
      sourceFiles: fileMetadataResult.value.fingerprintFiles,
      contentSignals: contentSignalsGuidanceBuilder.buildFingerprintSignals({
        contentSignals: input.accessGuidance?.contentSignals,
      }),
    });

    const agentContentResult = agentContentFileBuilder.build({
      siteName: input.siteName,
      baseUrl,
      buildFingerprint,
      contentSignalsConfigured:
        contentSignalsGuidanceBuilder.hasConfiguredSignals({
          contentSignals: input.accessGuidance?.contentSignals,
        }),
      contentExtraction: input.contentExtraction,
      maxLlmsFullContentTokens: DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS,
      outputDirectory: input.outputDirectory,
      pages: fileMetadataResult.value.pageMetadata,
    });

    const resourceLinkResult = await resourceLinkBuilder.build({
      baseUrl,
      buildFingerprint,
      outputDirectory: input.outputDirectory,
      pages: fileMetadataResult.value.pageMetadata,
    });

    if (resourceLinkResult.isErr()) {
      return err(resourceLinkResult.error);
    }

    const accessGuidanceResult = await accessGuidanceBuilder.build({
      buildFingerprint,
      outputDirectory: input.outputDirectory,
      sourceFileReferences: fileMetadataResult.value.sourceFileReferences,
      contentSignals: input.accessGuidance?.contentSignals,
    });

    if (accessGuidanceResult.isErr()) {
      return err(accessGuidanceResult.error);
    }

    const staticHeadersResult = await staticHeadersEngine.build({
      baseUrl,
      buildFingerprint,
      outputDirectory: input.outputDirectory,
      filePaths: input.filePaths,
      pages: fileMetadataResult.value.pageMetadata,
      platform: input.platform,
      staticHeaders: input.staticHeaders,
    });

    if (staticHeadersResult.isErr()) {
      return err(staticHeadersResult.error);
    }

    const writePlanResult = await writePlanBuilder.build({
      outputDirectory: input.outputDirectory,
      generatedFiles: agentContentResult.files,
      pageEdits: resourceLinkResult.value.pageEdits,
      accessGuidanceFiles: [
        ...accessGuidanceResult.value.files,
        ...staticHeadersResult.value.files,
      ],
    });

    if (writePlanResult.isErr()) {
      return err(writePlanResult.error);
    }

    const skippedFilePaths = [
      ...fileListResult.value.skippedFilePaths,
      ...agentContentResult.skippedFilePaths,
    ];
    const warnings = [
      ...normalizedBaseUrlResult.value.warnings,
      ...fileListResult.value.warnings,
      ...validationResult.value.warnings,
      ...agentContentResult.warnings,
      ...resourceLinkResult.value.warnings,
      ...accessGuidanceResult.value.warnings,
      ...staticHeadersResult.value.warnings,
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
}
