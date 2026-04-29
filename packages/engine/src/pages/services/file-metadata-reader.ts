import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFileReference } from "../../input/types/engine-file-reference";
import type { FileMetadataReadInput } from "../types/file-metadata-read-input";
import type { FileMetadataReadResult } from "../types/file-metadata-read-result";
import type { OpenNavPageMetadata } from "../types/opennav-page";
import { HtmlPageReader } from "./html-page-reader";
import { MarkdownPageReader } from "./markdown-page-reader";

/**
 * Creates page metadata from supported built site file references.
 */
export class FileMetadataReader {
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
   * Reads HTML and Markdown references into page metadata.
   *
   * @param input - Output directory, public base URL, and discovered file references.
   * @returns Page metadata for supported page files, or a typed OpenNav AI error.
   */
  public async read(
    input: FileMetadataReadInput,
  ): Promise<Result<FileMetadataReadResult, OpenNavError>> {
    const pageMetadata: OpenNavPageMetadata[] = [];

    for (const fileReference of input.fileReferences) {
      if (fileReference.kind === "html" || fileReference.kind === "markdown") {
        const pageMetadataResult = await this.getPageMetadata(
          input,
          fileReference,
        );

        if (pageMetadataResult.isErr()) {
          return err(pageMetadataResult.error);
        }

        pageMetadata.push(pageMetadataResult.value);
      } else {
        // TODO: If callers need a final report section for files that do not
        // produce page metadata, add that explicitly at the engine reporting
        // layer instead of returning a second skipped-files concept here.
      }
    }

    return ok({
      pageMetadata,
    });
  }

  private async getPageMetadata(
    input: FileMetadataReadInput,
    fileReference: EngineFileReference,
  ): Promise<Result<OpenNavPageMetadata, OpenNavError>> {
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
}
