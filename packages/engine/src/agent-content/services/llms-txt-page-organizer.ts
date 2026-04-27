import type { OpenNavPage } from "../../pages/types/opennav-page";
import type { LlmsTxtPageLink } from "../types/llms-txt-page-link";
import type { LlmsTxtPageOrganizeInput } from "../types/llms-txt-page-organize-input";
import type { LlmsTxtPageOrganizeResult } from "../types/llms-txt-page-organize-result";
import type { LlmsTxtPageSection } from "../types/llms-txt-page-section";
import { MarkdownPageArtifactPathBuilder } from "./markdown-page-artifact-path-builder";

interface PageSectionAssignment {
  readonly sectionKey: string;
  readonly route: string;
  readonly link: LlmsTxtPageLink;
}

/**
 * Groups validated pages into stable sections for `llms.txt`.
 */
export class LlmsTxtPageOrganizer {
  private readonly artifactPathBuilder: MarkdownPageArtifactPathBuilder;

  public constructor() {
    this.artifactPathBuilder = new MarkdownPageArtifactPathBuilder();
  }

  /**
   * Creates route-based sections whose links point at generated Markdown artifacts.
   *
   * @param input - Site base URL and validated page metadata.
   * @returns Ordered sections ready for `llms.txt` formatting.
   */
  public organize(input: LlmsTxtPageOrganizeInput): LlmsTxtPageOrganizeResult {
    const assignments = input.pages
      .map(
        (page: OpenNavPage): PageSectionAssignment =>
          this.createAssignment(input.baseUrl, page),
      )
      .sort(
        (first: PageSectionAssignment, second: PageSectionAssignment): number =>
          this.compareAssignments(first, second),
      );

    return {
      sections: this.buildSections(assignments),
    };
  }

  private buildHeading(sectionKey: string): string {
    if (sectionKey === "") {
      return "Root";
    }

    return sectionKey
      .split("/")
      .map((segment: string): string => this.capitalizeSegment(segment))
      .join(" / ");
  }

  private buildSections(
    assignments: readonly PageSectionAssignment[],
  ): readonly LlmsTxtPageSection[] {
    const sections: LlmsTxtPageSection[] = [];

    for (const assignment of assignments) {
      const lastSection = sections.at(-1);

      if (lastSection?.heading === this.buildHeading(assignment.sectionKey)) {
        sections[sections.length - 1] = {
          heading: lastSection.heading,
          links: [...lastSection.links, assignment.link],
        };
      } else {
        sections.push({
          heading: this.buildHeading(assignment.sectionKey),
          links: [assignment.link],
        });
      }
    }

    return sections;
  }

  private buildSectionKey(route: string): string {
    const segments = this.getRouteSegments(route);

    if (segments.length === 0) {
      return "";
    }

    if (segments.length > 2) {
      return segments.slice(0, 2).join("/");
    }

    return segments[0] ?? "";
  }

  private capitalizeSegment(segment: string): string {
    return segment
      .split("-")
      .map((word: string): string => this.capitalizeWord(word))
      .join(" ");
  }

  private capitalizeWord(word: string): string {
    if (word.length <= 3) {
      return word.toUpperCase();
    }

    return `${word[0]?.toUpperCase()}${word.slice(1)}`;
  }

  private compareAssignments(
    first: PageSectionAssignment,
    second: PageSectionAssignment,
  ): number {
    const sectionComparison = this.compareSectionKeys(
      first.sectionKey,
      second.sectionKey,
    );

    if (sectionComparison !== 0) {
      return sectionComparison;
    }

    return first.route.localeCompare(second.route);
  }

  private compareSectionKeys(first: string, second: string): number {
    if (first === second) {
      return 0;
    }

    if (first === "") {
      return -1;
    }

    if (second === "") {
      return 1;
    }

    return first.localeCompare(second);
  }

  private createAssignment(
    baseUrl: string,
    page: OpenNavPage,
  ): PageSectionAssignment {
    const artifactPath = this.artifactPathBuilder.build({
      baseUrl,
      page,
    });

    return {
      sectionKey: this.buildSectionKey(page.route),
      route: page.route,
      link: {
        title: page.title ?? page.route,
        url: artifactPath.publicUrl,
        description: page.description,
      },
    };
  }

  private getRouteSegments(route: string): readonly string[] {
    const trimmedRoute = route.replace(/^\/+|\/+$/g, "");

    if (trimmedRoute === "") {
      return [];
    }

    return trimmedRoute.split("/");
  }
}
