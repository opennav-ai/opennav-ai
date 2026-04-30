import { err, ok, type Result } from "neverthrow";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFile } from "../../input/types/engine-file";
import type { HtmlPageReadInput } from "../types/html-page-read-input";
import type { OpenNavPageMetadata } from "../types/opennav-page";
import { PageUrlBuilder } from "./page-url-builder";

/**
 * Creates lightweight internal page metadata from one HTML source file.
 *
 * The reader parses already-read HTML content with `parse5` only long enough to
 * extract title and description metadata. It returns source path, route, URL,
 * and metadata, but it does not store the HTML body or parsed tree on
 * `OpenNavPageMetadata`.
 */
export class HtmlPageReader {
  readonly #pageUrlBuilder: PageUrlBuilder;

  public constructor(pageUrlBuilder: PageUrlBuilder = new PageUrlBuilder()) {
    this.#pageUrlBuilder = pageUrlBuilder;
  }

  /**
   * Extracts metadata-only internal page data from one HTML file.
   *
   * @param input - Site base URL and already-read HTML file.
   * @returns Internal page metadata or a typed OpenNav AI error.
   */
  public async read(
    input: HtmlPageReadInput,
  ): Promise<Result<OpenNavPageMetadata, OpenNavError>> {
    if (input.file.kind !== "html") {
      return err(this.createUnsupportedFileKindError(input.file));
    }

    const document = parse(input.file.content);
    const pageUrl = this.#pageUrlBuilder.build({
      baseUrl: input.baseUrl,
      filePath: input.file.filePath,
    });

    return ok({
      sourceFilePath: input.file.filePath,
      sourceContentType: "html",
      route: pageUrl.route,
      canonicalUrl: pageUrl.canonicalUrl,
      title: this.extractTitle(document),
      description: this.extractDescription(document),
    });
  }

  private createUnsupportedFileKindError(file: EngineFile): OpenNavError {
    return {
      code: "HTML_PAGE_READER_UNSUPPORTED_FILE_KIND",
      message: "The HTML page reader can only read HTML files.",
      context: {
        filePath: file.filePath,
        kind: file.kind,
      },
    };
  }

  private extractDescription(
    node: DefaultTreeAdapterTypes.Node,
  ): string | undefined {
    const metaElement = this.findFirstElement(
      node,
      (element: DefaultTreeAdapterTypes.Element): boolean =>
        element.tagName === "meta" &&
        this.getAttributeValue(element, "name")?.toLowerCase() ===
          "description",
    );

    if (metaElement === undefined) {
      return undefined;
    }

    return this.normalizeText(this.getAttributeValue(metaElement, "content"));
  }

  private extractTitle(node: DefaultTreeAdapterTypes.Node): string | undefined {
    const titleElement = this.findFirstElement(
      node,
      (element: DefaultTreeAdapterTypes.Element): boolean =>
        element.tagName === "title",
    );
    const titleText = this.normalizeText(
      titleElement === undefined
        ? undefined
        : this.getTextContent(titleElement),
    );

    if (titleText !== undefined) {
      return titleText;
    }

    const headingElement = this.findFirstElement(
      node,
      (element: DefaultTreeAdapterTypes.Element): boolean =>
        element.tagName === "h1",
    );

    return this.normalizeText(
      headingElement === undefined
        ? undefined
        : this.getTextContent(headingElement),
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

  private getAttributeValue(
    element: DefaultTreeAdapterTypes.Element,
    attributeName: string,
  ): string | undefined {
    const normalizedAttributeName = attributeName.toLowerCase();
    const attribute = element.attrs.find(
      (candidate): boolean =>
        candidate.name.toLowerCase() === normalizedAttributeName,
    );

    return attribute?.value;
  }

  private getTextContent(node: DefaultTreeAdapterTypes.Node): string {
    if (this.isTextNode(node)) {
      return node.value;
    }

    if (!this.isParentNode(node)) {
      return "";
    }

    return node.childNodes
      .map((childNode: DefaultTreeAdapterTypes.ChildNode): string =>
        this.getTextContent(childNode),
      )
      .join("");
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

  private isTextNode(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.TextNode {
    return node.nodeName === "#text";
  }

  private normalizeText(value: string | undefined): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    const normalizedValue = value.replace(/\s+/gu, " ").trim();

    if (normalizedValue === "") {
      return undefined;
    }

    return normalizedValue;
  }
}
