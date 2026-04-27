import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFileReference } from "../../input/types/engine-file-reference";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { OpenNavPage } from "../types/opennav-page";
import type { PageListReadInput } from "../types/page-list-read-input";
import type { PageListReadResult } from "../types/page-list-read-result";
import { HtmlPageReader } from "./html-page-reader";
import { MarkdownPageReader } from "./markdown-page-reader";

/**
 * Creates metadata-only internal page data from discovered built site files.
 */
export class PageListReader {
  readonly #htmlPageReader: HtmlPageReader;
  readonly #markdownPageReader: MarkdownPageReader;

  public constructor(
    htmlPageReader: HtmlPageReader = new HtmlPageReader(),
    markdownPageReader: MarkdownPageReader = new MarkdownPageReader(),
  ) {
    this.#htmlPageReader = htmlPageReader;
    this.#markdownPageReader = markdownPageReader;
  }

  /**
   * Reads HTML and Markdown references into page data and skips non-page files.
   *
   * @param input - Output directory, public base URL, and discovered file references.
   * @returns Metadata-only pages and paths skipped for page data, or a typed OpenNav AI error.
   */
  public async read(
    input: PageListReadInput,
  ): Promise<Result<PageListReadResult, OpenNavError>> {
    const pages: OpenNavPage[] = [];
    const skippedFilePaths: EngineFilePath[] = [];

    for (const fileReference of input.fileReferences) {
      if (this.isPageReference(fileReference)) {
        const pageResult = await this.readPage(input, fileReference);

        if (pageResult.isErr()) {
          return err(pageResult.error);
        }

        pages.push(pageResult.value);
        continue;
      }

      skippedFilePaths.push(fileReference.filePath);
    }

    return ok({
      pages,
      skippedFilePaths,
    });
  }

  private async readPage(
    input: PageListReadInput,
    fileReference: EngineFileReference,
  ): Promise<Result<OpenNavPage, OpenNavError>> {
    if (fileReference.kind === "html") {
      return await this.#htmlPageReader.read({
        baseUrl: input.baseUrl,
        outputDirectory: input.outputDirectory,
        fileReference,
      });
    }

    return await this.#markdownPageReader.read({
      baseUrl: input.baseUrl,
      outputDirectory: input.outputDirectory,
      fileReference,
    });
  }

  private isPageReference(fileReference: EngineFileReference): boolean {
    return fileReference.kind === "html" || fileReference.kind === "markdown";
  }
}
