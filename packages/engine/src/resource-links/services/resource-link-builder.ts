import { MarkdownPageArtifactPathBuilder } from "../../agent-content/services/markdown-page-artifact-path-builder";
import type { MarkdownPageArtifactPathBuildResult } from "../../agent-content/types/markdown-page-artifact-path-build-result";
import { BuildFingerprintBuilder } from "../../build-fingerprint/services/build-fingerprint-builder";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import type { ResourceLink } from "../types/resource-link";
import type { ResourceLinkBuildInput } from "../types/resource-link-build-input";
import type { ResourceLinkBuildResult } from "../types/resource-link-build-result";
import type { ResourceLinkPageEdit } from "../types/resource-link-page-edit";
import { HtmlHeadLinkPlanner } from "./html-head-link-planner";

interface ResourceLinkBuilderDependencies {
  readonly buildFingerprintBuilder?: BuildFingerprintBuilder;
  readonly htmlHeadLinkPlanner?: HtmlHeadLinkPlanner;
  readonly markdownPageArtifactPathBuilder?: MarkdownPageArtifactPathBuilder;
}

/**
 * Builds in-memory resource-link page edits for HTML pages.
 */
export class ResourceLinkBuilder {
  readonly #buildFingerprintBuilder: BuildFingerprintBuilder;
  readonly #htmlHeadLinkPlanner: HtmlHeadLinkPlanner;
  readonly #markdownPageArtifactPathBuilder: MarkdownPageArtifactPathBuilder;

  /**
   * Creates a builder with default resource-link collaborators.
   *
   * @param dependencies - Optional collaborator overrides for focused tests.
   */
  public constructor(dependencies: ResourceLinkBuilderDependencies = {}) {
    this.#buildFingerprintBuilder =
      dependencies.buildFingerprintBuilder ?? new BuildFingerprintBuilder();
    this.#htmlHeadLinkPlanner =
      dependencies.htmlHeadLinkPlanner ?? new HtmlHeadLinkPlanner();
    this.#markdownPageArtifactPathBuilder =
      dependencies.markdownPageArtifactPathBuilder ??
      new MarkdownPageArtifactPathBuilder();
  }

  /**
   * Plans resource links for HTML pages without writing files.
   *
   * @param input - Site root and source pages available for link planning.
   * @returns Page edit plans and non-fatal warnings.
   */
  public build(input: ResourceLinkBuildInput): ResourceLinkBuildResult {
    const pageEdits: ResourceLinkPageEdit[] = [];
    const warnings: OpenNavError[] = [];
    const resourceLinkFingerprint =
      this.#buildFingerprintBuilder.buildShortFingerprint(
        input.buildFingerprint,
      );

    for (const buildPage of input.pages) {
      if (buildPage.page.sourceContentType !== "html") {
        continue;
      }

      const links = this.createLinks(input.baseUrl, buildPage.page);
      const pageEditResult = this.#htmlHeadLinkPlanner.plan({
        page: buildPage.page,
        resourceLinkFingerprint,
        sourceContent: buildPage.sourceContent,
        links,
      });

      if (pageEditResult.isOk()) {
        pageEdits.push(pageEditResult.value);
      } else {
        warnings.push(pageEditResult.error);
      }
    }

    return {
      pageEdits,
      warnings,
    };
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
}
