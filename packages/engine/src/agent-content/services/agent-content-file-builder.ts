import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import { EngineFileReader } from "../../input/services/engine-file-reader";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { AgentContentBuildInput } from "../types/agent-content-build-input";
import type { AgentContentBuildResult } from "../types/agent-content-build-result";
import type { AgentContentFile } from "../types/agent-content-file";
import type { AgentContentFileContent } from "../types/agent-content-file-content";
import type { LlmsFullTxtPageContent } from "../types/llms-full-txt-page-content";
import { AgentContentFileBuildFingerprintDecorator } from "./agent-content-file-build-fingerprint-decorator";
import { LlmsFilePlacementBuilder } from "./llms-file-placement-builder";
import { LlmsFullTxtGenerator } from "./llms-full-txt-generator";
import { LlmsTxtGenerator } from "./llms-txt-generator";
import { MarkdownPageArtifactGenerator } from "./markdown-page-artifact-generator";
import { MarkdownPageArtifactPathBuilder } from "./markdown-page-artifact-path-builder";
import { O200kBaseLlmsFullTxtTokenCounter } from "./o200k-base-llms-full-txt-token-counter";
import { OpenNavManifestGenerator } from "./opennav-manifest-generator";

const LLMS_FULL_TXT_OUTPUT_FILE_PATH: EngineFilePath = "llms-full.txt";

interface AgentContentFileBuilderDependencies {
  readonly llmsFilePlacementBuilder?: LlmsFilePlacementBuilder;
  readonly llmsFullTxtGenerator?: LlmsFullTxtGenerator;
  readonly llmsTxtGenerator?: LlmsTxtGenerator;
  readonly markdownPageArtifactGenerator?: MarkdownPageArtifactGenerator;
  readonly markdownPageArtifactPathBuilder?: MarkdownPageArtifactPathBuilder;
  readonly buildFingerprintDecorator?: AgentContentFileBuildFingerprintDecorator;
  readonly openNavManifestGenerator?: OpenNavManifestGenerator;
  readonly fileReader?: EngineFileReader;
}

/**
 * Plans the Phase 1 files that agents can read directly from a static site.
 *
 * The builder receives already-validated site metadata and page metadata plus
 * the built output directory. It returns an in-memory file plan with
 * output-directory-relative paths such as `llms.txt`, `index.md`,
 * `docs/api.md`, `llms-full.txt`, `.well-known/llms.txt`, and
 * `.well-known/opennav.json`. Each planned file exposes a `getContent`
 * callback so later write planning can inspect every path before page bodies
 * are read or converted from disk.
 *
 * Responsibilities:
 *
 * - Plan root and `.well-known` copies of `llms.txt` first as the lightweight
 *   site map of generated Markdown endpoints.
 * - Reserve existing Markdown page paths so generated HTML mirrors do not
 *   overwrite source files such as `docs/api.md`.
 * - Plan mirrored Markdown artifacts for HTML pages, such as `index.html` to
 *   `index.md` and `docs/api.html` to `docs/api.md`.
 * - Generate Markdown page bodies lazily, passing the full page list to the
 *   Markdown generator so internal links can be rewritten to known generated
 *   Markdown endpoints.
 * - Plan root and `.well-known` copies of `llms-full.txt` last and defer their
 *   shared page-body reads, Markdown conversion, and token-cap warnings until
 *   one of their `getContent` callbacks runs.
 * - Plan `.well-known/opennav.json` as the static compatibility manifest that
 *   points agents at the generated files and build fingerprint.
 *
 * This class does not discover files, validate site data, write to `dist/`,
 * inject HTML tags, or decide final filesystem create/overwrite behavior.
 * Later milestones consume this file plan and turn it into concrete write
 * operations.
 */
export class AgentContentFileBuilder {
  readonly #llmsFilePlacementBuilder: LlmsFilePlacementBuilder;
  readonly #llmsFullTxtGenerator: LlmsFullTxtGenerator;
  readonly #llmsTxtGenerator: LlmsTxtGenerator;
  readonly #markdownPageArtifactGenerator: MarkdownPageArtifactGenerator;
  readonly #markdownPageArtifactPathBuilder: MarkdownPageArtifactPathBuilder;
  readonly #buildFingerprintDecorator: AgentContentFileBuildFingerprintDecorator;
  readonly #openNavManifestGenerator: OpenNavManifestGenerator;
  readonly #fileReader: EngineFileReader;

  /**
   * Creates a builder with default content generators.
   *
   * @param dependencies - Optional generator overrides for focused tests.
   */
  public constructor(dependencies: AgentContentFileBuilderDependencies = {}) {
    this.#llmsFilePlacementBuilder =
      dependencies.llmsFilePlacementBuilder ?? new LlmsFilePlacementBuilder();
    this.#llmsFullTxtGenerator =
      dependencies.llmsFullTxtGenerator ??
      new LlmsFullTxtGenerator(new O200kBaseLlmsFullTxtTokenCounter());
    this.#llmsTxtGenerator =
      dependencies.llmsTxtGenerator ?? new LlmsTxtGenerator();
    this.#markdownPageArtifactGenerator =
      dependencies.markdownPageArtifactGenerator ??
      new MarkdownPageArtifactGenerator();
    this.#markdownPageArtifactPathBuilder =
      dependencies.markdownPageArtifactPathBuilder ??
      new MarkdownPageArtifactPathBuilder();
    this.#buildFingerprintDecorator =
      dependencies.buildFingerprintDecorator ??
      new AgentContentFileBuildFingerprintDecorator();
    this.#openNavManifestGenerator =
      dependencies.openNavManifestGenerator ?? new OpenNavManifestGenerator();
    this.#fileReader = dependencies.fileReader ?? new EngineFileReader();
  }

  /**
   * Builds an in-memory file plan without generating file bodies.
   *
   * @param input - Site metadata, token cap, and lazy source pages.
   * @returns Generated file entries with lazy content callbacks and planning diagnostics.
   */
  public build(input: AgentContentBuildInput): AgentContentBuildResult {
    const files: AgentContentFile[] = [];
    const reservedOutputFilePaths = new Set<EngineFilePath>();

    // Priority 1: the site map is always planned first at both root and
    // `.well-known` paths.
    this.addFiles(
      input,
      files,
      reservedOutputFilePaths,
      this.#llmsFilePlacementBuilder.build(this.createLlmsTxtFile(input)),
    );

    // Priority 2: existing Markdown pages already occupy their `.md` paths, so
    // generated HTML mirrors do not overwrite them.
    this.reserveExistingMarkdownPagePaths(input, reservedOutputFilePaths);

    // Priority 3: HTML page files get mirrored `.md` artifacts by source path.
    for (const page of input.pages) {
      this.addMarkdownPageArtifactFile(
        input,
        page,
        files,
        reservedOutputFilePaths,
      );
    }

    // Priority 4: the full-context file has stable root and `.well-known`
    // paths and is capped lazily when either shared content callback runs.
    this.addFiles(
      input,
      files,
      reservedOutputFilePaths,
      this.#llmsFilePlacementBuilder.build(this.createLlmsFullTxtFile(input)),
    );

    // Priority 5: the static compatibility manifest is valid JSON, so it
    // carries the build fingerprint as a field rather than an appended comment.
    this.addFileWithoutBuildFingerprintMarker(
      files,
      reservedOutputFilePaths,
      this.createOpenNavManifestFile(input),
    );

    return {
      files,
      skippedFilePaths: [],
      warnings: [],
    };
  }

  private addFile(
    input: AgentContentBuildInput,
    files: AgentContentFile[],
    reservedOutputFilePaths: Set<EngineFilePath>,
    file: AgentContentFile,
  ): void {
    // The registry is the single duplicate-path gate. It keeps the file list
    // deterministic and prevents lower-priority content callbacks from running.
    if (reservedOutputFilePaths.has(file.outputFilePath)) {
      return;
    }

    reservedOutputFilePaths.add(file.outputFilePath);
    files.push(
      this.#buildFingerprintDecorator.decorate({
        file,
        buildFingerprint: input.buildFingerprint,
      }),
    );
  }

  private addFiles(
    input: AgentContentBuildInput,
    files: AgentContentFile[],
    reservedOutputFilePaths: Set<EngineFilePath>,
    newFiles: readonly AgentContentFile[],
  ): void {
    for (const file of newFiles) {
      this.addFile(input, files, reservedOutputFilePaths, file);
    }
  }

  private addFileWithoutBuildFingerprintMarker(
    files: AgentContentFile[],
    reservedOutputFilePaths: Set<EngineFilePath>,
    file: AgentContentFile,
  ): void {
    if (reservedOutputFilePaths.has(file.outputFilePath)) {
      return;
    }

    reservedOutputFilePaths.add(file.outputFilePath);
    files.push(file);
  }

  private addMarkdownPageArtifactFile(
    input: AgentContentBuildInput,
    page: OpenNavPageMetadata,
    files: AgentContentFile[],
    reservedOutputFilePaths: Set<EngineFilePath>,
  ): void {
    if (page.sourceContentType !== "html") {
      return;
    }

    this.addFile(
      input,
      files,
      reservedOutputFilePaths,
      this.createMarkdownPageArtifactFile(input, page),
    );
  }

  private async buildMarkdownPageContent(
    input: AgentContentBuildInput,
    page: OpenNavPageMetadata,
    includeSiteIndexBacklink: boolean,
  ): Promise<Result<string, OpenNavError>> {
    const sourceContentResult = await this.readPageSourceContent(input, page);

    if (sourceContentResult.isErr()) {
      return err(sourceContentResult.error);
    }

    const artifactResult = this.#markdownPageArtifactGenerator.generate({
      baseUrl: input.baseUrl,
      page,
      pages: input.pages,
      contentExtraction: input.contentExtraction,
      sourceContent: sourceContentResult.value,
      includeSiteIndexBacklink,
    });

    if (artifactResult.isErr()) {
      return err(artifactResult.error);
    }

    return ok(artifactResult.value.content);
  }

  private createLlmsFullTxtFile(
    input: AgentContentBuildInput,
  ): AgentContentFile {
    return {
      outputFilePath: LLMS_FULL_TXT_OUTPUT_FILE_PATH,
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > => {
        const pagesResult = await this.createLlmsFullTxtPages(input);

        if (pagesResult.isErr()) {
          return err(pagesResult.error);
        }

        const generationResult = this.#llmsFullTxtGenerator.generate({
          siteName: input.siteName,
          baseUrl: input.baseUrl,
          siteDescription: input.siteDescription,
          maxContentTokens: input.maxLlmsFullContentTokens,
          pages: pagesResult.value,
        });

        if (generationResult.isErr()) {
          return err(generationResult.error);
        }

        return ok({
          content: generationResult.value.content,
          warnings: generationResult.value.warnings,
        });
      },
    };
  }

  private createLlmsTxtFile(input: AgentContentBuildInput): AgentContentFile {
    return {
      outputFilePath: "llms.txt",
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > => {
        const generationResult = this.#llmsTxtGenerator.generate({
          siteName: input.siteName,
          baseUrl: input.baseUrl,
          siteDescription: input.siteDescription,
          pages: input.pages,
        });

        return ok({
          content: generationResult.content,
          warnings: [],
        });
      },
    };
  }

  private createOpenNavManifestFile(
    input: AgentContentBuildInput,
  ): AgentContentFile {
    const generationResult = this.#openNavManifestGenerator.generate({
      baseUrl: input.baseUrl,
      buildFingerprint: input.buildFingerprint,
      htmlResourceLinks: input.pages.some(
        (page: OpenNavPageMetadata): boolean =>
          page.sourceContentType === "html",
      ),
      contentSignals: input.contentSignalsConfigured ?? false,
    });

    return {
      outputFilePath: generationResult.outputFilePath,
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > =>
        ok({
          content: generationResult.content,
          warnings: [],
        }),
    };
  }

  private async createLlmsFullTxtPages(
    input: AgentContentBuildInput,
  ): Promise<Result<readonly LlmsFullTxtPageContent[], OpenNavError>> {
    const pages: LlmsFullTxtPageContent[] = [];

    for (const page of input.pages) {
      const markdownContentResult = await this.buildMarkdownPageContent(
        input,
        page,
        false,
      );

      if (markdownContentResult.isErr()) {
        return err(markdownContentResult.error);
      }

      pages.push({
        page,
        markdownContent: markdownContentResult.value,
      });
    }

    return ok(pages);
  }

  private createMarkdownPageArtifactFile(
    input: AgentContentBuildInput,
    page: OpenNavPageMetadata,
  ): AgentContentFile {
    const artifactPath = this.#markdownPageArtifactPathBuilder.build({
      baseUrl: input.baseUrl,
      page,
    });

    return {
      outputFilePath: artifactPath.outputFilePath,
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > => {
        const markdownContentResult = await this.buildMarkdownPageContent(
          input,
          page,
          true,
        );

        if (markdownContentResult.isErr()) {
          return err(markdownContentResult.error);
        }

        return ok({
          content: markdownContentResult.value,
          warnings: [],
        });
      },
    };
  }

  private reserveExistingMarkdownPagePaths(
    input: AgentContentBuildInput,
    reservedOutputFilePaths: Set<EngineFilePath>,
  ): void {
    for (const page of input.pages) {
      if (page.sourceContentType !== "markdown") {
        continue;
      }

      const artifactPath = this.#markdownPageArtifactPathBuilder.build({
        baseUrl: input.baseUrl,
        page,
      });

      reservedOutputFilePaths.add(artifactPath.outputFilePath);
    }
  }

  private async readPageSourceContent(
    input: AgentContentBuildInput,
    page: OpenNavPageMetadata,
  ): Promise<Result<string, OpenNavError>> {
    const readResult = await this.#fileReader.read({
      outputDirectory: input.outputDirectory,
      filePath: page.sourceFilePath,
    });

    if (readResult.isErr()) {
      return err(readResult.error);
    }

    return ok(readResult.value.content);
  }
}
