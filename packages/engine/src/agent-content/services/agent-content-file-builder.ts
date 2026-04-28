import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPage } from "../../pages/types/opennav-page";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { AgentContentBuildInput } from "../types/agent-content-build-input";
import type { AgentContentBuildPage } from "../types/agent-content-build-page";
import type { AgentContentBuildResult } from "../types/agent-content-build-result";
import type { AgentContentFile } from "../types/agent-content-file";
import type { AgentContentFileContent } from "../types/agent-content-file-content";
import type { LlmsFullTxtPageContent } from "../types/llms-full-txt-page-content";
import { LlmsFullTxtGenerator } from "./llms-full-txt-generator";
import { LlmsTxtGenerator } from "./llms-txt-generator";
import { MarkdownPageArtifactGenerator } from "./markdown-page-artifact-generator";
import { MarkdownPageArtifactPathBuilder } from "./markdown-page-artifact-path-builder";
import { O200kBaseLlmsFullTxtTokenCounter } from "./o200k-base-llms-full-txt-token-counter";

const LLMS_FULL_TXT_OUTPUT_FILE_PATH: EngineFilePath = "llms-full.txt";

interface AgentContentFileBuilderDependencies {
  readonly llmsFullTxtGenerator?: LlmsFullTxtGenerator;
  readonly llmsTxtGenerator?: LlmsTxtGenerator;
  readonly markdownPageArtifactGenerator?: MarkdownPageArtifactGenerator;
  readonly markdownPageArtifactPathBuilder?: MarkdownPageArtifactPathBuilder;
}

/**
 * Plans lazy agent-readable content files for a validated static site.
 *
 * Existing Markdown page paths reserve their own `.md` endpoints. HTML page
 * paths then get mirrored Markdown files unless that `.md` path already exists.
 */
export class AgentContentFileBuilder {
  readonly #llmsFullTxtGenerator: LlmsFullTxtGenerator;
  readonly #llmsTxtGenerator: LlmsTxtGenerator;
  readonly #markdownPageArtifactGenerator: MarkdownPageArtifactGenerator;
  readonly #markdownPageArtifactPathBuilder: MarkdownPageArtifactPathBuilder;

  /**
   * Creates a builder with default content generators.
   *
   * @param dependencies - Optional generator overrides for focused tests.
   */
  public constructor(dependencies: AgentContentFileBuilderDependencies = {}) {
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

    // Priority 1: the site map is always planned first and owns `llms.txt`.
    this.addFile(files, reservedOutputFilePaths, this.createLlmsTxtFile(input));

    // Priority 2: existing Markdown pages already occupy their `.md` paths, so
    // generated HTML mirrors do not overwrite them.
    this.reserveExistingMarkdownPagePaths(input, reservedOutputFilePaths);

    // Priority 3: HTML page files get mirrored `.md` artifacts by source path.
    for (const pageInput of input.pages) {
      this.addMarkdownPageArtifactFile(
        input,
        pageInput,
        files,
        reservedOutputFilePaths,
      );
    }

    // Priority 4: the full-context file has a stable root path and is capped
    // lazily when its content callback runs.
    this.addFile(
      files,
      reservedOutputFilePaths,
      this.createLlmsFullTxtFile(input),
    );

    return {
      files,
      skippedFilePaths: [],
      warnings: [],
    };
  }

  private addFile(
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
    files.push(file);
  }

  private addMarkdownPageArtifactFile(
    input: AgentContentBuildInput,
    pageInput: AgentContentBuildPage,
    files: AgentContentFile[],
    reservedOutputFilePaths: Set<EngineFilePath>,
  ): void {
    if (pageInput.page.sourceContentType !== "html") {
      return;
    }

    this.addFile(
      files,
      reservedOutputFilePaths,
      this.createMarkdownPageArtifactFile(input, pageInput),
    );
  }

  private async buildMarkdownPageContent(
    input: AgentContentBuildInput,
    pageInput: AgentContentBuildPage,
  ): Promise<Result<string, OpenNavError>> {
    const sourceContentResult = await pageInput.getSourceContent();

    if (sourceContentResult.isErr()) {
      return err(sourceContentResult.error);
    }

    const artifactResult = this.#markdownPageArtifactGenerator.generate({
      baseUrl: input.baseUrl,
      page: pageInput.page,
      pages: input.pages.map(
        (candidate: AgentContentBuildPage): OpenNavPage => candidate.page,
      ),
      sourceContent: sourceContentResult.value,
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
          pages: input.pages.map(
            (pageInput: AgentContentBuildPage): OpenNavPage => pageInput.page,
          ),
        });

        return ok({
          content: generationResult.content,
          warnings: [],
        });
      },
    };
  }

  private async createLlmsFullTxtPages(
    input: AgentContentBuildInput,
  ): Promise<Result<readonly LlmsFullTxtPageContent[], OpenNavError>> {
    const pages: LlmsFullTxtPageContent[] = [];

    for (const pageInput of input.pages) {
      const markdownContentResult = await this.buildMarkdownPageContent(
        input,
        pageInput,
      );

      if (markdownContentResult.isErr()) {
        return err(markdownContentResult.error);
      }

      pages.push({
        page: pageInput.page,
        markdownContent: markdownContentResult.value,
      });
    }

    return ok(pages);
  }

  private createMarkdownPageArtifactFile(
    input: AgentContentBuildInput,
    pageInput: AgentContentBuildPage,
  ): AgentContentFile {
    const artifactPath = this.#markdownPageArtifactPathBuilder.build({
      baseUrl: input.baseUrl,
      page: pageInput.page,
    });

    return {
      outputFilePath: artifactPath.outputFilePath,
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > => {
        const markdownContentResult = await this.buildMarkdownPageContent(
          input,
          pageInput,
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
    for (const pageInput of input.pages) {
      if (pageInput.page.sourceContentType !== "markdown") {
        continue;
      }

      const artifactPath = this.#markdownPageArtifactPathBuilder.build({
        baseUrl: input.baseUrl,
        page: pageInput.page,
      });

      reservedOutputFilePaths.add(artifactPath.outputFilePath);
    }
  }
}
