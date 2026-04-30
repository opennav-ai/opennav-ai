import { err, ok, type Result } from "neverthrow";
import { BuildFingerprintBuilder } from "../../build-fingerprint/services/build-fingerprint-builder";
import type { BuildFingerprintFileInput } from "../../build-fingerprint/types/build-fingerprint-file-input";
import type { OpenNavError } from "../../common/types/opennav-error";
import { EngineFileReader } from "../../input/services/engine-file-reader";
import type { EngineFile } from "../../input/types/engine-file";
import type { EngineFileReference } from "../../input/types/engine-file-reference";
import type { FileMetadataReadInput } from "../types/file-metadata-read-input";
import type { FileMetadataReadResult } from "../types/file-metadata-read-result";
import type { OpenNavPageMetadata } from "../types/opennav-page";
import { HtmlPageReader } from "./html-page-reader";
import { MarkdownPageReader } from "./markdown-page-reader";

interface FileMetadataReaderDependencies {
  readonly buildFingerprintBuilder?: BuildFingerprintBuilder;
  readonly engineFileReader?: EngineFileReader;
  readonly htmlPageReader?: HtmlPageReader;
  readonly markdownPageReader?: MarkdownPageReader;
}

/**
 * Prepares supported built site source files for metadata-driven planning.
 */
export class FileMetadataReader {
  readonly #buildFingerprintBuilder: BuildFingerprintBuilder;
  readonly #engineFileReader: EngineFileReader;
  readonly #htmlPageReader: HtmlPageReader;
  readonly #markdownPageReader: MarkdownPageReader;

  /**
   * Creates a reader with default file, fingerprint, and page metadata collaborators.
   *
   * @param dependencies - Optional collaborator overrides for focused tests.
   */
  public constructor(dependencies: FileMetadataReaderDependencies = {}) {
    this.#buildFingerprintBuilder =
      dependencies.buildFingerprintBuilder ?? new BuildFingerprintBuilder();
    this.#engineFileReader =
      dependencies.engineFileReader ?? new EngineFileReader();
    this.#htmlPageReader = dependencies.htmlPageReader ?? new HtmlPageReader();
    this.#markdownPageReader =
      dependencies.markdownPageReader ?? new MarkdownPageReader();
  }

  /**
   * Reads supported source files into lightweight planning metadata.
   *
   * @param input - Site base URL, output directory, and supported source file references.
   * @returns Page metadata, content fingerprints, and lightweight source references.
   */
  public async read(
    input: FileMetadataReadInput,
  ): Promise<Result<FileMetadataReadResult, OpenNavError>> {
    const fingerprintFiles: BuildFingerprintFileInput[] = [];
    const pageMetadata: OpenNavPageMetadata[] = [];
    const sourceFileReferences: EngineFileReference[] = [];

    for (const fileReference of input.fileReferences) {
      const readResult = await this.#engineFileReader.read({
        outputDirectory: input.outputDirectory,
        filePath: fileReference.filePath,
      });

      if (readResult.isErr()) {
        return err(readResult.error);
      }

      if (this.isOpenNavManagedMarkdownSourceFile(readResult.value)) {
        continue;
      }

      sourceFileReferences.push({
        filePath: readResult.value.filePath,
        kind: readResult.value.kind,
      });
      fingerprintFiles.push({
        filePath: readResult.value.filePath,
        contentFingerprint:
          this.#buildFingerprintBuilder.buildContentFingerprint({
            content: readResult.value.content,
            sourceContentKind: readResult.value.kind,
          }),
      });

      const pageMetadataResult = await this.readPageMetadata(
        input.baseUrl,
        readResult.value,
      );

      if (pageMetadataResult.isErr()) {
        return err(pageMetadataResult.error);
      }

      pageMetadata.push(...pageMetadataResult.value);
    }

    return ok({
      fingerprintFiles,
      pageMetadata,
      sourceFileReferences,
    });
  }

  private async readPageMetadata(
    baseUrl: string,
    file: EngineFile,
  ): Promise<Result<readonly OpenNavPageMetadata[], OpenNavError>> {
    const pageMetadata: OpenNavPageMetadata[] = [];

    if (file.kind === "html" || file.kind === "markdown") {
      const pageMetadataResult = await this.getPageMetadata(baseUrl, file);

      if (pageMetadataResult.isErr()) {
        return err(pageMetadataResult.error);
      }

      pageMetadata.push(pageMetadataResult.value);
    } else {
      // TODO: If callers need a final report section for files that do not
      // produce page metadata, add that explicitly at the engine reporting
      // layer instead of returning a second skipped-files concept here.
    }

    return ok(pageMetadata);
  }

  private isOpenNavManagedMarkdownSourceFile(sourceFile: EngineFile): boolean {
    return (
      sourceFile.kind === "markdown" &&
      sourceFile.content.includes('opennav compatible="true"') &&
      sourceFile.content.includes('manifest="/.well-known/opennav.json"')
    );
  }

  private async getPageMetadata(
    baseUrl: string,
    file: EngineFile,
  ): Promise<Result<OpenNavPageMetadata, OpenNavError>> {
    if (file.kind === "html") {
      return await this.#htmlPageReader.read({
        baseUrl,
        file,
      });
    }

    return await this.#markdownPageReader.read({
      baseUrl,
      file,
    });
  }
}
