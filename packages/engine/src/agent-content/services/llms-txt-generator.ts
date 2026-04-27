import type { LlmsTxtGenerateInput } from "../types/llms-txt-generate-input";
import type { LlmsTxtGenerateResult } from "../types/llms-txt-generate-result";
import type { LlmsTxtPageLink } from "../types/llms-txt-page-link";
import type { LlmsTxtPageSection } from "../types/llms-txt-page-section";
import { LlmsTxtPageOrganizer } from "./llms-txt-page-organizer";

/**
 * Creates the root `llms.txt` file content from validated page metadata.
 */
export class LlmsTxtGenerator {
  private readonly pageOrganizer: LlmsTxtPageOrganizer;

  /**
   * Creates a generator with the default route-based page organizer.
   */
  public constructor() {
    this.pageOrganizer = new LlmsTxtPageOrganizer();
  }

  /**
   * Generates in-memory `llms.txt` content for the static site.
   *
   * @param input - Site name, optional site description, and validated page metadata.
   * @returns The output path and complete text content for `llms.txt`.
   */
  public generate(input: LlmsTxtGenerateInput): LlmsTxtGenerateResult {
    const organizedPages = this.pageOrganizer.organize({
      baseUrl: input.baseUrl,
      pages: input.pages,
    });

    return {
      outputFilePath: "llms.txt",
      content: this.formatContent(input, organizedPages.sections),
    };
  }

  private formatContent(
    input: LlmsTxtGenerateInput,
    sections: readonly LlmsTxtPageSection[],
  ): string {
    const lines: string[] = [`# ${input.siteName}`];

    if (this.isNonBlank(input.siteDescription)) {
      lines.push("", `> ${input.siteDescription}`);
    }

    for (const section of sections) {
      lines.push("", `## ${section.heading}`, "");

      for (const link of section.links) {
        lines.push(this.formatLink(link));
      }
    }

    return `${lines.join("\n")}\n`;
  }

  private formatLink(link: LlmsTxtPageLink): string {
    const linkText = `- [${link.title}](${link.url})`;

    if (!this.isNonBlank(link.description)) {
      return linkText;
    }

    return `${linkText}: ${link.description}`;
  }

  private isNonBlank(value: string | undefined): value is string {
    return value !== undefined && value.trim() !== "";
  }
}
