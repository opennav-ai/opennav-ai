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

interface LlmsFullTxtContentBuildResult {
  readonly content: string;
  readonly omittedPages: readonly LlmsFullTxtPageContent[];
}

/**
 * Creates capped `llms-full.txt` content from generated Markdown page bodies.
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
   * Generates in-memory `llms-full.txt` content up to the configured token limit.
   *
   * @param input - Site metadata, explicit token limit, and generated page Markdown bodies.
   * @returns Generated full-context content with warnings when later page blocks are omitted.
   */
  public generate(
    input: LlmsFullTxtGenerateInput,
  ): Result<LlmsFullTxtGenerateResult, OpenNavError> {
    const contentBuildResult = this.formatContent(input);
    const actualContentTokens = this.#tokenCounter.count(
      contentBuildResult.content,
    );
    const warnings =
      contentBuildResult.omittedPages.length === 0
        ? []
        : [
            this.createTokenLimitWarning(
              input,
              actualContentTokens,
              contentBuildResult.omittedPages,
            ),
          ];

    return ok({
      outputFilePath: LLMS_FULL_TXT_OUTPUT_FILE_PATH,
      content: contentBuildResult.content,
      skippedFilePaths: [],
      warnings,
    });
  }

  private appendPageBlockWithinTokenLimit(
    lines: string[],
    input: LlmsFullTxtGenerateInput,
    section: LlmsTxtPageSection,
    link: LlmsTxtPageLink,
    markdownContent: string,
    sectionHasAcceptedPage: boolean,
    hasAcceptedAnyPage: boolean,
  ): boolean {
    const candidateLines = [
      ...lines,
      ...this.createPageBlockLines(
        section,
        link,
        markdownContent,
        sectionHasAcceptedPage,
        hasAcceptedAnyPage,
      ),
    ];
    const candidateContent = `${candidateLines.join("\n")}\n`;
    const actualContentTokens = this.#tokenCounter.count(candidateContent);

    if (actualContentTokens > input.maxContentTokens) {
      return false;
    }

    lines.splice(0, lines.length, ...candidateLines);

    return true;
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

  private createTokenLimitWarning(
    input: LlmsFullTxtGenerateInput,
    actualContentTokens: number,
    omittedPages: readonly LlmsFullTxtPageContent[],
  ): OpenNavError {
    return {
      code: "LLMS_FULL_TXT_TOKEN_LIMIT_REACHED",
      message:
        "The generated llms-full.txt file stopped before adding content that would exceed the configured token limit.",
      context: {
        outputFilePath: LLMS_FULL_TXT_OUTPUT_FILE_PATH,
        maxContentTokens: input.maxContentTokens,
        actualContentTokens,
        omittedPageCount: omittedPages.length,
        omittedPageSourceFilePaths: omittedPages.map(
          (pageContent: LlmsFullTxtPageContent): string =>
            pageContent.page.sourceFilePath,
        ),
      },
    };
  }

  private createPageBlockLines(
    section: LlmsTxtPageSection,
    link: LlmsTxtPageLink,
    markdownContent: string,
    sectionHasAcceptedPage: boolean,
    hasAcceptedAnyPage: boolean,
  ): readonly string[] {
    const lines: string[] = [];

    if (hasAcceptedAnyPage) {
      lines.push("", "---");
    }

    if (!sectionHasAcceptedPage) {
      lines.push("", `## ${section.heading}`);
    }

    lines.push("", this.formatPageBlock(link, markdownContent));

    return lines;
  }

  private findPageContentByPublicUrl(
    input: LlmsFullTxtGenerateInput,
    publicUrl: string,
  ): LlmsFullTxtPageContent | undefined {
    return input.pages.find((pageContent: LlmsFullTxtPageContent): boolean => {
      const artifactPath = this.#artifactPathBuilder.build({
        baseUrl: input.baseUrl,
        page: pageContent.page,
      });

      return artifactPath.publicUrl === publicUrl;
    });
  }

  private formatContent(
    input: LlmsFullTxtGenerateInput,
  ): LlmsFullTxtContentBuildResult {
    const organizedPages = this.#pageOrganizer.organize({
      baseUrl: input.baseUrl,
      pages: input.pages.map(
        (pageContent: LlmsFullTxtPageContent) => pageContent.page,
      ),
    });
    const contentByPublicUrl = this.buildContentByPublicUrl(input);
    const lines: string[] = [`# ${input.siteName}`];
    const omittedPages: LlmsFullTxtPageContent[] = [];
    let hasAcceptedAnyPage = false;
    let tokenLimitReached = false;

    if (this.isNonBlank(input.siteDescription)) {
      lines.push("", `> ${input.siteDescription}`);
    }

    for (const section of organizedPages.sections) {
      let sectionHasAcceptedPage = false;

      for (const link of section.links) {
        const pageContent = this.findPageContentByPublicUrl(input, link.url);

        if (tokenLimitReached) {
          if (pageContent !== undefined) {
            omittedPages.push(pageContent);
          }
          continue;
        }

        const didAppendPageBlock = this.appendPageBlockWithinTokenLimit(
          lines,
          input,
          section,
          link,
          contentByPublicUrl.get(link.url) ?? "",
          sectionHasAcceptedPage,
          hasAcceptedAnyPage,
        );

        if (didAppendPageBlock) {
          sectionHasAcceptedPage = true;
          hasAcceptedAnyPage = true;
          continue;
        }

        tokenLimitReached = true;

        if (pageContent !== undefined) {
          omittedPages.push(pageContent);
        }
      }
    }

    return {
      content: `${lines.join("\n")}\n`,
      omittedPages,
    };
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
