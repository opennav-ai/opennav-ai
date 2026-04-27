import { ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { LlmsFullTxtGenerateInput } from "../types/llms-full-txt-generate-input";
import type { LlmsFullTxtGenerateResult } from "../types/llms-full-txt-generate-result";
import type { LlmsFullTxtPageContent } from "../types/llms-full-txt-page-content";
import type { LlmsFullTxtTokenCounter } from "../types/llms-full-txt-token-counter";
import type { LlmsTxtPageLink } from "../types/llms-txt-page-link";
import type { LlmsTxtPageSection } from "../types/llms-txt-page-section";
import { LlmsTxtPageOrganizer } from "./llms-txt-page-organizer";
import { MarkdownPageArtifactPathBuilder } from "./markdown-page-artifact-path-builder";

const LLMS_FULL_TXT_OUTPUT_FILE_PATH = "llms-full.txt";

/**
 * Creates optional `llms-full.txt` content from generated Markdown page bodies.
 */
export class LlmsFullTxtGenerator {
  readonly #artifactPathBuilder: MarkdownPageArtifactPathBuilder;
  readonly #pageOrganizer: LlmsTxtPageOrganizer;
  readonly #tokenCounter: LlmsFullTxtTokenCounter;

  /**
   * Creates a generator with configured token counting and default route collaborators.
   *
   * @param tokenCounter - Counts complete `llms-full.txt` content before limit checks.
   * @param pageOrganizer - Groups pages into the same route sections used by `llms.txt`.
   * @param artifactPathBuilder - Builds generated Markdown artifact URLs for page bodies.
   */
  public constructor(
    tokenCounter: LlmsFullTxtTokenCounter,
    pageOrganizer: LlmsTxtPageOrganizer = new LlmsTxtPageOrganizer(),
    artifactPathBuilder: MarkdownPageArtifactPathBuilder = new MarkdownPageArtifactPathBuilder(),
  ) {
    this.#tokenCounter = tokenCounter;
    this.#pageOrganizer = pageOrganizer;
    this.#artifactPathBuilder = artifactPathBuilder;
  }

  /**
   * Generates in-memory `llms-full.txt` content when the configured token limit allows it.
   *
   * @param input - Site metadata, explicit token limit, and generated page Markdown bodies.
   * @returns Generated full-context content or a skipped-file warning result.
   */
  public generate(
    input: LlmsFullTxtGenerateInput,
  ): Result<LlmsFullTxtGenerateResult, OpenNavError> {
    const content = this.formatContent(input);
    const actualContentTokens = this.#tokenCounter.count(content);

    if (actualContentTokens > input.maxContentTokens) {
      return ok({
        outputFilePath: undefined,
        content: undefined,
        skippedFilePaths: [LLMS_FULL_TXT_OUTPUT_FILE_PATH],
        warnings: [this.createTokenLimitWarning(input, actualContentTokens)],
      });
    }

    return ok({
      outputFilePath: LLMS_FULL_TXT_OUTPUT_FILE_PATH,
      content,
      skippedFilePaths: [],
      warnings: [],
    });
  }

  private buildContentByPublicUrl(
    input: LlmsFullTxtGenerateInput,
  ): ReadonlyMap<string, string> {
    const contentByPublicUrl = new Map<string, string>();

    for (const pageContent of input.pages) {
      const artifactPath = this.#artifactPathBuilder.build({
        baseUrl: input.baseUrl,
        page: pageContent.page,
      });

      contentByPublicUrl.set(
        artifactPath.publicUrl,
        pageContent.markdownContent,
      );
    }

    return contentByPublicUrl;
  }

  private countPages(sections: readonly LlmsTxtPageSection[]): number {
    return sections.reduce(
      (pageCount: number, section: LlmsTxtPageSection): number =>
        pageCount + section.links.length,
      0,
    );
  }

  private createTokenLimitWarning(
    input: LlmsFullTxtGenerateInput,
    actualContentTokens: number,
  ): OpenNavError {
    return {
      code: "LLMS_FULL_TXT_TOKEN_LIMIT_EXCEEDED",
      message:
        "The generated llms-full.txt file exceeded the configured token limit.",
      context: {
        outputFilePath: LLMS_FULL_TXT_OUTPUT_FILE_PATH,
        maxContentTokens: input.maxContentTokens,
        actualContentTokens,
      },
    };
  }

  private formatContent(input: LlmsFullTxtGenerateInput): string {
    const organizedPages = this.#pageOrganizer.organize({
      baseUrl: input.baseUrl,
      pages: input.pages.map(
        (pageContent: LlmsFullTxtPageContent) => pageContent.page,
      ),
    });
    const contentByPublicUrl = this.buildContentByPublicUrl(input);
    const lines: string[] = [`# ${input.siteName}`];
    const totalPageCount = this.countPages(organizedPages.sections);
    let formattedPageCount = 0;

    if (this.isNonBlank(input.siteDescription)) {
      lines.push("", `> ${input.siteDescription}`);
    }

    for (const section of organizedPages.sections) {
      lines.push("", `## ${section.heading}`);

      for (const link of section.links) {
        formattedPageCount += 1;
        lines.push(
          "",
          this.formatPageBlock(link, contentByPublicUrl.get(link.url) ?? ""),
        );

        if (formattedPageCount < totalPageCount) {
          lines.push("", "---");
        }
      }
    }

    return `${lines.join("\n")}\n`;
  }

  private formatPageBlock(
    link: LlmsTxtPageLink,
    markdownContent: string,
  ): string {
    const lines: string[] = [`### ${link.title}`, "", `URL: ${link.url}`];

    if (this.isNonBlank(link.description)) {
      lines.push("", link.description);
    }

    const normalizedMarkdownContent =
      this.removeTrailingNewlines(markdownContent);

    if (normalizedMarkdownContent !== "") {
      lines.push("", normalizedMarkdownContent);
    }

    return lines.join("\n");
  }

  private isNonBlank(value: string | undefined): value is string {
    return value !== undefined && value.trim() !== "";
  }

  private removeTrailingNewlines(value: string): string {
    return value.replace(/\n+$/u, "");
  }
}
