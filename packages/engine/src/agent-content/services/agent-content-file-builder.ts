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
import { IndexMdFallbackGenerator } from "./index-md-fallback-generator";
import { LlmsFullTxtGenerator } from "./llms-full-txt-generator";
import { LlmsTxtGenerator } from "./llms-txt-generator";
import { MarkdownPageArtifactGenerator } from "./markdown-page-artifact-generator";
import { MarkdownPageArtifactPathBuilder } from "./markdown-page-artifact-path-builder";
import { O200kBaseLlmsFullTxtTokenCounter } from "./o200k-base-llms-full-txt-token-counter";

const INDEX_MD_FALLBACK_OUTPUT_FILE_PATH: EngineFilePath = "index.md";
const LLMS_FULL_TXT_OUTPUT_FILE_PATH: EngineFilePath = "llms-full.txt";

interface AgentContentFileBuilderDependencies {
  readonly indexMdFallbackGenerator?: IndexMdFallbackGenerator;
  readonly llmsFullTxtGenerator?: LlmsFullTxtGenerator;
  readonly llmsTxtGenerator?: LlmsTxtGenerator;
  readonly markdownPageArtifactGenerator?: MarkdownPageArtifactGenerator;
  readonly markdownPageArtifactPathBuilder?: MarkdownPageArtifactPathBuilder;
}

/**
 * Plans lazy agent-readable content files for a validated static site.
 *
 * File paths are claimed in write-priority order: `llms.txt`, mirrored
 * Markdown page artifacts, `llms-full.txt`, then optional `index.md` fallback.
 * Once a path is claimed, later lower-priority files do not run for that path.
 */
export class AgentContentFileBuilder {
  readonly #indexMdFallbackGenerator: IndexMdFallbackGenerator;
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
    this.#indexMdFallbackGenerator =
      dependencies.indexMdFallbackGenerator ?? new IndexMdFallbackGenerator();
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
   * @param input - Site metadata, token cap, fallback option, and lazy source pages.
   * @returns Generated file entries with lazy content callbacks and planning diagnostics.
   */
  public build(input: AgentContentBuildInput): AgentContentBuildResult {
    const files: AgentContentFile[] = [];
    const reservedOutputFilePaths = new Set<EngineFilePath>();

    // Priority 1: the site map is always planned first and owns `llms.txt`.
    this.addFile(files, reservedOutputFilePaths, this.createLlmsTxtFile(input));

    // Priority 2: mirrored Markdown artifacts own page `.md` paths. If two
    // source pages map to the same output path, the first validated page wins.
    for (const pageInput of input.pages) {
      this.addFile(
        files,
        reservedOutputFilePaths,
        this.createMarkdownPageArtifactFile(input, pageInput),
      );
    }

    // Priority 3: the full-context file has a stable root path and is capped
    // lazily when its content callback runs.
    this.addFile(
      files,
      reservedOutputFilePaths,
      this.createLlmsFullTxtFile(input),
    );

    // Priority 4: fallback paths are only planned after higher-priority files
    // have claimed their paths, so fallback generation never duplicates a file.
    this.addIndexMdFallbackFile(input, files, reservedOutputFilePaths);

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

  private addIndexMdFallbackFile(
    input: AgentContentBuildInput,
    files: AgentContentFile[],
    reservedOutputFilePaths: Set<EngineFilePath>,
  ): void {
    // `index.md` fallback is copy-through convenience content. If a mirrored
    // page artifact already owns `index.md`, that artifact is the priority file.
    if (
      !input.generateIndexMdFallback ||
      reservedOutputFilePaths.has(INDEX_MD_FALLBACK_OUTPUT_FILE_PATH)
    ) {
      return;
    }

    const rootPageInput = this.findRootPageInput(input.pages);

    if (rootPageInput === undefined) {
      return;
    }

    this.addFile(
      files,
      reservedOutputFilePaths,
      this.createIndexMdFallbackFile(input, rootPageInput),
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
      sourceContent: sourceContentResult.value,
    });

    if (artifactResult.isErr()) {
      return err(artifactResult.error);
    }

    return ok(artifactResult.value.content);
  }

  private createIndexMdFallbackFile(
    input: AgentContentBuildInput,
    pageInput: AgentContentBuildPage,
  ): AgentContentFile {
    return {
      outputFilePath: INDEX_MD_FALLBACK_OUTPUT_FILE_PATH,
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

        const fallbackResult = this.#indexMdFallbackGenerator.generate({
          enabled: true,
          page: pageInput.page,
          markdownContent: markdownContentResult.value,
        });

        if (fallbackResult.isErr()) {
          return err(fallbackResult.error);
        }

        return ok({
          content: fallbackResult.value.content ?? "",
          warnings: fallbackResult.value.warnings,
        });
      },
    };
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

  private findRootPageInput(
    pageInputs: readonly AgentContentBuildPage[],
  ): AgentContentBuildPage | undefined {
    return pageInputs.find(
      (pageInput: AgentContentBuildPage): boolean =>
        pageInput.page.route === "/",
    );
  }
}
