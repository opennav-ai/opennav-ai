import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import { EngineFileReader } from "../../input/services/engine-file-reader";
import type { EngineFileReference } from "../../input/types/engine-file-reference";
import type { MarkdownPageReadInput } from "../types/markdown-page-read-input";
import type { OpenNavPageMetadata } from "../types/opennav-page";
import { PageUrlBuilder } from "./page-url-builder";

/**
 * Creates lightweight internal page metadata from one Markdown source file.
 *
 * The reader loads a single Markdown file only long enough to extract the page
 * title and description. It returns source path, route, URL, and metadata, but
 * it does not store the Markdown body on `OpenNavPageMetadata`; later content artifact
 * generators can read one page body at a time when they actually need it.
 */
export class MarkdownPageReader {
  readonly #fileReader: EngineFileReader;
  readonly #pageUrlBuilder: PageUrlBuilder;

  public constructor(
    fileReader: EngineFileReader = new EngineFileReader(),
    pageUrlBuilder: PageUrlBuilder = new PageUrlBuilder(),
  ) {
    this.#fileReader = fileReader;
    this.#pageUrlBuilder = pageUrlBuilder;
  }

  /**
   * Reads one Markdown file and returns metadata-only internal page data.
   *
   * @param input - Output directory, site base URL, and Markdown file reference to read.
   * @returns Internal page metadata or a typed OpenNav AI error.
   */
  public async read(
    input: MarkdownPageReadInput,
  ): Promise<Result<OpenNavPageMetadata, OpenNavError>> {
    if (input.fileReference.kind !== "markdown") {
      return err(this.createUnsupportedFileKindError(input.fileReference));
    }

    const fileResult = await this.#fileReader.read({
      outputDirectory: input.outputDirectory,
      filePath: input.fileReference.filePath,
    });

    if (fileResult.isErr()) {
      return err(fileResult.error);
    }

    const pageUrl = this.#pageUrlBuilder.build({
      baseUrl: input.baseUrl,
      filePath: input.fileReference.filePath,
    });

    return ok({
      sourceFilePath: input.fileReference.filePath,
      sourceContentType: "markdown",
      route: pageUrl.route,
      canonicalUrl: pageUrl.canonicalUrl,
      title: this.extractTitle(fileResult.value.content),
      description: this.extractDescription(fileResult.value.content),
    });
  }

  private createUnsupportedFileKindError(
    fileReference: EngineFileReference,
  ): OpenNavError {
    return {
      code: "MARKDOWN_PAGE_READER_UNSUPPORTED_FILE_KIND",
      message: "The Markdown page reader can only read Markdown files.",
      context: {
        filePath: fileReference.filePath,
        kind: fileReference.kind,
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
