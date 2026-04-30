import { err, ok, type Result } from "neverthrow";
import { MarkdownPageArtifactPathBuilder } from "../../agent-content/services/markdown-page-artifact-path-builder";
import type { MarkdownPageArtifactPathBuildResult } from "../../agent-content/types/markdown-page-artifact-path-build-result";
import type { OpenNavError } from "../../common/types/opennav-error";
import { EngineFileReader } from "../../input/services/engine-file-reader";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import type { ResourceLink } from "../types/resource-link";
import type { ResourceLinkBuildInput } from "../types/resource-link-build-input";
import type { ResourceLinkBuildResult } from "../types/resource-link-build-result";
import type { ResourceLinkPageEdit } from "../types/resource-link-page-edit";
import { HtmlHeadLinkPlanner } from "./html-head-link-planner";

interface ResourceLinkBuilderDependencies {
  readonly htmlHeadLinkPlanner?: HtmlHeadLinkPlanner;
  readonly markdownPageArtifactPathBuilder?: MarkdownPageArtifactPathBuilder;
  readonly fileReader?: EngineFileReader;
}

/**
 * Builds in-memory resource-link page edits for HTML pages.
 */
export class ResourceLinkBuilder {
  readonly #htmlHeadLinkPlanner: HtmlHeadLinkPlanner;
  readonly #markdownPageArtifactPathBuilder: MarkdownPageArtifactPathBuilder;
  readonly #fileReader: EngineFileReader;

  /**
   * Creates a builder with default resource-link collaborators.
   *
   * @param dependencies - Optional collaborator overrides for focused tests.
   */
  public constructor(dependencies: ResourceLinkBuilderDependencies = {}) {
    this.#htmlHeadLinkPlanner =
      dependencies.htmlHeadLinkPlanner ?? new HtmlHeadLinkPlanner();
    this.#markdownPageArtifactPathBuilder =
      dependencies.markdownPageArtifactPathBuilder ??
      new MarkdownPageArtifactPathBuilder();
    this.#fileReader = dependencies.fileReader ?? new EngineFileReader();
  }

  /**
   * Plans resource links for HTML pages without writing files.
   *
   * @param input - Site root and source pages available for link planning.
   * @returns Page edit plans with non-fatal warnings, or a typed file read error.
   */
  public async build(
    input: ResourceLinkBuildInput,
  ): Promise<Result<ResourceLinkBuildResult, OpenNavError>> {
    const pageEdits: ResourceLinkPageEdit[] = [];
    const warnings: OpenNavError[] = [];

    for (const page of input.pages) {
      if (page.sourceContentType !== "html") {
        continue;
      }

      const sourceContentResult = await this.readPageSourceContent(input, page);

      if (sourceContentResult.isErr()) {
        return err(sourceContentResult.error);
      }

      const links = this.createLinks(input.baseUrl, page);
      const pageEditResult = this.#htmlHeadLinkPlanner.plan({
        page,
        resourceLinkFingerprint: input.buildFingerprint,
        sourceContent: sourceContentResult.value,
        links,
      });

      if (pageEditResult.isOk()) {
        pageEdits.push(pageEditResult.value);
      } else {
        warnings.push(pageEditResult.error);
      }
    }

    return ok({
      pageEdits,
      warnings,
    });
  }

  private buildSiteIndexUrl(baseUrl: string): string {
    return `${baseUrl.replace(/\/+$/, "")}/llms.txt`;
  }

  private createLinks(
    baseUrl: string,
    page: OpenNavPageMetadata,
  ): readonly ResourceLink[] {
    const artifactPath: MarkdownPageArtifactPathBuildResult =
      this.#markdownPageArtifactPathBuilder.build({
        baseUrl,
        page,
      });

    return [
      {
        relation: "alternate",
        mediaType: "text/markdown",
        href: artifactPath.publicUrl,
      },
      {
        relation: "index",
        mediaType: "text/plain",
        href: this.buildSiteIndexUrl(baseUrl),
        title: "LLMs text site index",
      },
    ];
  }

  private async readPageSourceContent(
    input: ResourceLinkBuildInput,
    page: OpenNavPageMetadata,
  ): Promise<Result<string, OpenNavError>> {
    const readResult = await this.#fileReader.read({
      outputDirectory: input.outputDirectory,
      filePath: page.sourceFilePath,
    });

    if (readResult.isErr()) {
      return err(readResult.error);
    }

    return ok(readResult.value.content);
  }
}
