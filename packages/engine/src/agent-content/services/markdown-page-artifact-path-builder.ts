import type { EngineFilePath } from "../../types/engine-file-path";
import type { MarkdownPageArtifactPathBuildInput } from "../types/markdown-page-artifact-path-build-input";
import type { MarkdownPageArtifactPathBuildResult } from "../types/markdown-page-artifact-path-build-result";

/**
 * Builds stable file paths and URLs for generated Markdown page artifacts.
 */
export class MarkdownPageArtifactPathBuilder {
  /**
   * Converts a page source path into its generated Markdown endpoint address.
   *
   * @param input - Site base URL and page metadata with a source file path.
   * @returns The output path and public URL for the generated Markdown page.
   */
  public build(
    input: MarkdownPageArtifactPathBuildInput,
  ): MarkdownPageArtifactPathBuildResult {
    const outputFilePath = this.buildOutputFilePath(input.page.sourceFilePath);

    return {
      outputFilePath,
      publicUrl: this.buildPublicUrl(input.baseUrl, outputFilePath),
    };
  }

  private buildOutputFilePath(sourceFilePath: EngineFilePath): EngineFilePath {
    const normalizedFilePath = sourceFilePath.replaceAll("\\", "/");

    if (normalizedFilePath.endsWith(".html")) {
      return `${normalizedFilePath.slice(0, -".html".length)}.md`;
    }

    return normalizedFilePath;
  }

  private buildPublicUrl(
    baseUrl: string,
    outputFilePath: EngineFilePath,
  ): string {
    const trimmedBaseUrl = baseUrl.replace(/\/+$/, "");

    return `${trimmedBaseUrl}/${outputFilePath}`;
  }
}
