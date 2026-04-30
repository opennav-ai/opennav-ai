import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFile } from "../../input/types/engine-file";
import type { MarkdownPageReadInput } from "../types/markdown-page-read-input";
import type { OpenNavPageMetadata } from "../types/opennav-page";
import { PageUrlBuilder } from "./page-url-builder";

/**
 * Creates lightweight internal page metadata from one Markdown source file.
 *
 * The reader uses already-read Markdown content to extract the page title and
 * description. It returns source path, route, URL, and metadata, but it does not
 * store the Markdown body on `OpenNavPageMetadata`.
 */
export class MarkdownPageReader {
  readonly #pageUrlBuilder: PageUrlBuilder;

  public constructor(pageUrlBuilder: PageUrlBuilder = new PageUrlBuilder()) {
    this.#pageUrlBuilder = pageUrlBuilder;
  }

  /**
   * Extracts metadata-only internal page data from one Markdown file.
   *
   * @param input - Site base URL and already-read Markdown file.
   * @returns Internal page metadata or a typed OpenNav AI error.
   */
  public async read(
    input: MarkdownPageReadInput,
  ): Promise<Result<OpenNavPageMetadata, OpenNavError>> {
    if (input.file.kind !== "markdown") {
      return err(this.createUnsupportedFileKindError(input.file));
    }

    const pageUrl = this.#pageUrlBuilder.build({
      baseUrl: input.baseUrl,
      filePath: input.file.filePath,
    });

    return ok({
      sourceFilePath: input.file.filePath,
      sourceContentType: "markdown",
      route: pageUrl.route,
      canonicalUrl: pageUrl.canonicalUrl,
      title: this.extractTitle(input.file.content),
      description: this.extractDescription(input.file.content),
    });
  }

  private createUnsupportedFileKindError(file: EngineFile): OpenNavError {
    return {
      code: "MARKDOWN_PAGE_READER_UNSUPPORTED_FILE_KIND",
      message: "The Markdown page reader can only read Markdown files.",
      context: {
        filePath: file.filePath,
        kind: file.kind,
      },
    };
  }

  private extractDescription(content: string): string | undefined {
    const paragraphLines: string[] = [];

    for (const line of this.getLines(content)) {
      if (this.isBlankLine(line)) {
        if (paragraphLines.length > 0) {
          return paragraphLines.join(" ");
        }

        continue;
      }

      if (!this.isNormalParagraphLine(line)) {
        if (paragraphLines.length > 0) {
          return paragraphLines.join(" ");
        }

        continue;
      }

      paragraphLines.push(line.trim());
    }

    if (paragraphLines.length > 0) {
      return paragraphLines.join(" ");
    }

    return undefined;
  }

  private extractTitle(content: string): string | undefined {
    for (const line of this.getLines(content)) {
      const title = this.extractTopLevelHeadingText(line);

      if (title !== undefined) {
        return title;
      }
    }

    return undefined;
  }

  private extractTopLevelHeadingText(line: string): string | undefined {
    const match = line.match(/^\s{0,3}#\s+(.+?)\s*#*\s*$/u);

    if (match === null) {
      return undefined;
    }

    return match[1].trim();
  }

  private getLines(content: string): readonly string[] {
    return content.split(/\r?\n/u);
  }

  private isBlankLine(line: string): boolean {
    return line.trim() === "";
  }

  private isNormalParagraphLine(line: string): boolean {
    const trimmedLine = line.trim();

    return (
      trimmedLine !== "" &&
      this.extractTopLevelHeadingText(trimmedLine) === undefined &&
      !this.isMarkdownControlLine(trimmedLine)
    );
  }

  private isMarkdownControlLine(line: string): boolean {
    return (
      line.startsWith(">") ||
      line.startsWith("```") ||
      line.startsWith("~~~") ||
      line.startsWith("|") ||
      /^#{1,6}\s+/u.test(line) ||
      /^[-*+]\s+/u.test(line) ||
      /^\d+\.\s+/u.test(line)
    );
  }
}
