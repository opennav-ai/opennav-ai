import { createHash } from "node:crypto";
import { err, ok, type Result } from "neverthrow";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { HtmlHeadLinkPlanInput } from "../types/html-head-link-plan-input";
import type { ResourceLink } from "../types/resource-link";
import type { ResourceLinkPageEdit } from "../types/resource-link-page-edit";

/**
 * Plans safe HTML `<head>` insertions for page resource links.
 */
export class HtmlHeadLinkPlanner {
  /**
   * Creates one page edit when the source HTML contains a real `<head>` tag.
   *
   * @param input - Page source content and resource links to serialize.
   * @returns Planned page edit, or a typed warning when no safe source `<head>` exists.
   */
  public plan(
    input: HtmlHeadLinkPlanInput,
  ): Result<ResourceLinkPageEdit, OpenNavError> {
    const headElement = this.findSourceHeadElement(input.sourceContent);
    const headInsertionOffset =
      headElement?.sourceCodeLocation?.startTag?.endOffset;

    if (headInsertionOffset === undefined) {
      return err({
        code: "RESOURCE_LINK_HTML_HEAD_MISSING",
        message:
          "HTML page does not have a source <head> element for safe resource link insertion.",
        context: {
          sourceFilePath: input.page.sourceFilePath,
        },
      });
    }

    return ok({
      sourceFilePath: input.page.sourceFilePath,
      headInsertionOffset,
      links: input.links,
      headLinkMarkup: this.serializeHeadLinkMarkup(input.links),
    });
  }

  private escapeHtmlAttribute(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  private findSourceHeadElement(
    sourceContent: string,
  ): DefaultTreeAdapterTypes.Element | undefined {
    const document = parse(sourceContent, {
      sourceCodeLocationInfo: true,
    });

    return this.findFirstElement(
      document,
      (element: DefaultTreeAdapterTypes.Element): boolean =>
        element.tagName === "head" &&
        element.sourceCodeLocation?.startTag !== undefined,
    );
  }

  private findFirstElement(
    node: DefaultTreeAdapterTypes.Node,
    predicate: (element: DefaultTreeAdapterTypes.Element) => boolean,
  ): DefaultTreeAdapterTypes.Element | undefined {
    if (this.isElement(node) && predicate(node)) {
      return node;
    }

    if (!this.isParentNode(node)) {
      return undefined;
    }

    for (const childNode of node.childNodes) {
      const foundElement = this.findFirstElement(childNode, predicate);

      if (foundElement !== undefined) {
        return foundElement;
      }
    }

    return undefined;
  }

  private isElement(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.Element {
    return "tagName" in node;
  }

  private isParentNode(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.ParentNode {
    return "childNodes" in node;
  }

  private serializeHeadLinkMarkup(links: readonly ResourceLink[]): string {
    return `\n${links
      .map((link: ResourceLink): string => `  ${this.serializeLinkTag(link)}`)
      .join("\n")}\n`;
  }

  private serializeLinkTag(link: ResourceLink): string {
    const titleAttribute =
      link.title === undefined
        ? ""
        : ` title="${this.escapeHtmlAttribute(link.title)}"`;
    const openNavSha = this.createOpenNavSha(link);

    return `<link rel="${this.escapeHtmlAttribute(
      link.relation,
    )}" type="${this.escapeHtmlAttribute(
      link.mediaType,
    )}" href="${this.escapeHtmlAttribute(
      link.href,
    )}"${titleAttribute} data-opennav="resource-link" data-opennav-sha="${this.escapeHtmlAttribute(openNavSha)}">`;
  }

  private createOpenNavSha(link: ResourceLink): string {
    const content = JSON.stringify({
      href: link.href,
      mediaType: link.mediaType,
      relation: link.relation,
      title: link.title ?? null,
    });

    return `sha256:${createHash("sha256").update(content).digest("hex")}`;
  }
}
