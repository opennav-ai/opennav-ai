import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "./common/types/opennav-error";
import { EngineFileListReader } from "./input/services/engine-file-list-reader";
import type { EngineExecuteInput } from "./types/engine-execute-input";
import type { EngineExecuteOptions } from "./types/engine-execute-options";
import type { EngineExecuteResult } from "./types/engine-execute-result";

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
    void options;

    const fileListReader = new EngineFileListReader();
    const fileListResult = await fileListReader.read({
      outputDirectory: input.outputDirectory,
      filePaths: input.filePaths,
    });

    if (fileListResult.isErr()) {
      return err(fileListResult.error);
    }

    return ok({
      createdFilePaths: [],
      modifiedFilePaths: [],
      skippedFilePaths: fileListResult.value.skippedFilePaths,
      warnings: fileListResult.value.warnings,
    });
  }
}

// Phase 1 orchestration sketch.
//
// This block is intentionally commented out. It is the proposed call flow for
// the future Milestone 11 engine wiring, after Milestone 9 adds DistFileWriter
// and Milestone 10 adds BuildResultReporter. The next concrete code slice
// should stay narrower than this sketch: add DistFileWriter so a WritePlan can
// be applied to the output folder without moving overwrite-safety decisions out
// of WritePlanBuilder.
//
// Concrete user-visible flow:
//
// 1. The caller passes `siteName`, `baseUrl`, `outputDirectory`, and
//    output-directory-relative `filePaths`.
// 2. The engine reads the listed `.html`, `.md`, and `robots.txt` files.
// 3. The engine creates page metadata, validates it, and builds one build
//    fingerprint for this run.
// 4. The engine prepares lazy generated files such as `llms.txt`, Markdown
//    mirrors, `llms-full.txt`, and `/.well-known/opennav.json`.
// 5. The engine prepares HTML page edits and optional `robots.txt` guidance.
// 6. The engine asks WritePlanBuilder for the exact create, overwrite, and
//    edit operations.
// 7. In dry-run mode, the engine reports that plan without writing.
// 8. In write mode, DistFileWriter applies only the approved operations.
// 9. BuildResultReporter turns write records and warnings into the public
//    EngineExecuteResult shape.
//
// Internal classes in call order:
//
// - EngineFileListReader: classifies caller-provided paths.
// - PageListReader: reads HTML and Markdown page metadata.
// - OpenNavSiteValidator: rejects invalid site settings and page metadata.
// - EngineFileReader: reads exact source bodies when later steps need them.
// - BuildFingerprintBuilder: fingerprints source files and normalized run
//   settings.
// - AgentContentFileBuilder: plans lazy generated agent-readable files.
// - ResourceLinkBuilder: plans HTML `<head>` resource-link edits.
// - AccessGuidanceBuilder: plans optional `robots.txt` Content Signals guidance.
// - WritePlanBuilder: creates the dry-run filesystem operation plan.
// - DistFileWriter: applies the approved plan to `outputDirectory`.
// - BuildResultReporter: produces the final machine-readable engine report.
//
// Future code shape:
//
// class EngineExecutionOrchestrator {
//   readonly #fileListReader: EngineFileListReader;
//   readonly #pageListReader: PageListReader;
//   readonly #siteValidator: OpenNavSiteValidator;
//   readonly #fileReader: EngineFileReader;
//   readonly #buildFingerprintBuilder: BuildFingerprintBuilder;
//   readonly #agentContentFileBuilder: AgentContentFileBuilder;
//   readonly #resourceLinkBuilder: ResourceLinkBuilder;
//   readonly #accessGuidanceBuilder: AccessGuidanceBuilder;
//   readonly #writePlanBuilder: WritePlanBuilder;
//   readonly #distFileWriter: DistFileWriter;
//   readonly #buildResultReporter: BuildResultReporter;
//
//   public async execute(
//     input: EngineExecuteInput,
//     options: EngineExecuteOptions,
//   ): Promise<Result<EngineExecuteResult, OpenNavError>> {
//     const fileListResult = await this.#fileListReader.read({
//       outputDirectory: input.outputDirectory,
//       filePaths: input.filePaths,
//     });
//
//     if (fileListResult.isErr()) {
//       return err(fileListResult.error);
//     }
//
//     const pageListResult = await this.#pageListReader.read({
//       baseUrl: input.baseUrl,
//       outputDirectory: input.outputDirectory,
//       fileReferences: fileListResult.value.fileReferences,
//     });
//
//     if (pageListResult.isErr()) {
//       return err(pageListResult.error);
//     }
//
//     const validationResult = this.#siteValidator.validate({
//       siteName: input.siteName,
//       baseUrl: input.baseUrl,
//       pages: pageListResult.value.pages,
//       mode: "strict",
//     });
//
//     if (validationResult.isErr()) {
//       return err(validationResult.error);
//     }
//
//     const sourceFilesResult = await this.readSourceFilesForPlanning({
//       outputDirectory: input.outputDirectory,
//       fileReferences: fileListResult.value.fileReferences,
//     });
//
//     if (sourceFilesResult.isErr()) {
//       return err(sourceFilesResult.error);
//     }
//
//     const buildFingerprint =
//       this.#buildFingerprintBuilder.buildBuildFingerprint({
//         siteName: input.siteName,
//         baseUrl: input.baseUrl,
//         sourceFiles: sourceFilesResult.value.fingerprintFiles,
//         contentSignals: this.serializeContentSignals(input.accessGuidance),
//       });
//
//     const agentContentResult = this.#agentContentFileBuilder.build({
//       siteName: input.siteName,
//       baseUrl: input.baseUrl,
//       buildFingerprint,
//       contentSignalsConfigured:
//         input.accessGuidance?.contentSignals !== undefined,
//       maxLlmsFullContentTokens: DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS,
//       pages: pageListResult.value.pages.map((page) => ({
//         page,
//         getSourceContent: () =>
//           this.readPageSourceContent({
//             outputDirectory: input.outputDirectory,
//             sourceFiles: sourceFilesResult.value.sourceFiles,
//             page,
//           }),
//       })),
//     });
//
//     const resourceLinkResult = this.#resourceLinkBuilder.build({
//       baseUrl: input.baseUrl,
//       pages: this.createResourceLinkPages({
//         pages: pageListResult.value.pages,
//         sourceFiles: sourceFilesResult.value.sourceFiles,
//       }),
//     });
//
//     const accessGuidanceResult = this.#accessGuidanceBuilder.build({
//       buildFingerprint,
//       robotsTxtFile: this.findRobotsTxtSourceFile(
//         sourceFilesResult.value.sourceFiles,
//       ),
//       contentSignals: input.accessGuidance?.contentSignals,
//     });
//
//     const writePlanResult = await this.#writePlanBuilder.build({
//       outputDirectory: input.outputDirectory,
//       generatedFiles: agentContentResult.files,
//       pageEdits: resourceLinkResult.pageEdits,
//       accessGuidanceFiles: accessGuidanceResult.files,
//     });
//
//     if (writePlanResult.isErr()) {
//       return err(writePlanResult.error);
//     }
//
//     if (options.dryRun === true) {
//       return this.#buildResultReporter.reportDryRun({
//         writePlan: writePlanResult.value.plan,
//         skippedFilePaths: [
//           ...fileListResult.value.skippedFilePaths,
//           ...pageListResult.value.skippedFilePaths,
//           ...agentContentResult.skippedFilePaths,
//         ],
//         warnings: [
//           ...fileListResult.value.warnings,
//           ...validationResult.value.warnings,
//           ...agentContentResult.warnings,
//           ...resourceLinkResult.warnings,
//           ...accessGuidanceResult.warnings,
//           ...writePlanResult.value.warnings,
//         ],
//       });
//     }
//
//     const writeResult = await this.#distFileWriter.write({
//       outputDirectory: input.outputDirectory,
//       plan: writePlanResult.value.plan,
//     });
//
//     if (writeResult.isErr()) {
//       return err(writeResult.error);
//     }
//
//     return this.#buildResultReporter.reportWrite({
//       records: writeResult.value.records,
//       skippedFilePaths: [
//         ...fileListResult.value.skippedFilePaths,
//         ...pageListResult.value.skippedFilePaths,
//         ...agentContentResult.skippedFilePaths,
//       ],
//       warnings: [
//         ...fileListResult.value.warnings,
//         ...validationResult.value.warnings,
//         ...agentContentResult.warnings,
//         ...resourceLinkResult.warnings,
//         ...accessGuidanceResult.warnings,
//         ...writePlanResult.value.warnings,
//         ...writeResult.value.warnings,
//       ],
//     });
//   }
// }
