import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { MarkdownPageArtifactGenerateInput } from "../types/markdown-page-artifact-generate-input";
import type { MarkdownPageArtifactGenerateResult } from "../types/markdown-page-artifact-generate-result";
import { MarkdownPageArtifactPathBuilder } from "./markdown-page-artifact-path-builder";
import { PageMarkdownContentGenerator } from "./page-markdown-content-generator";

/**
 * Creates one in-memory mirrored Markdown page artifact from a source page body.
 */
export class MarkdownPageArtifactGenerator {
  readonly #contentGenerator: PageMarkdownContentGenerator;
  readonly #pathBuilder: MarkdownPageArtifactPathBuilder;

  /**
   * Creates a generator with default page content and path collaborators.
   *
   * @param contentGenerator - Converts one source page body into Markdown.
   * @param pathBuilder - Builds the mirrored `.md` file path and public URL.
   */
  public constructor(
    contentGenerator: PageMarkdownContentGenerator = new PageMarkdownContentGenerator(),
    pathBuilder: MarkdownPageArtifactPathBuilder = new MarkdownPageArtifactPathBuilder(),
  ) {
    this.#contentGenerator = contentGenerator;
    this.#pathBuilder = pathBuilder;
  }

  /**
   * Generates an in-memory Markdown page artifact for one source page.
   *
   * @param input - Site base URL, page metadata, and exact source file content.
   * @returns Generated Markdown file path, URL, and content or a typed OpenNav AI error.
   */
  public generate(
    input: MarkdownPageArtifactGenerateInput,
  ): Result<MarkdownPageArtifactGenerateResult, OpenNavError> {
    const pathResult = this.#pathBuilder.build({
      baseUrl: input.baseUrl,
      page: input.page,
    });
    const contentResult = this.#contentGenerator.generate({
      page: input.page,
      sourceContent: input.sourceContent,
    });

    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    return ok({
      outputFilePath: pathResult.outputFilePath,
      publicUrl: pathResult.publicUrl,
      content: contentResult.value.content,
    });
  }
}
