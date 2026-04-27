import { err, ok, type Result } from "neverthrow";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import type { OpenNavError } from "../../common/types/opennav-error";
import { EngineFileReader } from "../../input/services/engine-file-reader";
import type { EngineFileReference } from "../../input/types/engine-file-reference";
import type { HtmlPageReadInput } from "../types/html-page-read-input";
import type { OpenNavPage } from "../types/opennav-page";
import { PageUrlBuilder } from "./page-url-builder";

/**
 * Creates lightweight internal page metadata from one HTML source file.
 *
 * The reader loads and parses a single HTML file with `parse5` only long enough
 * to extract title and description metadata. It returns source path, route,
 * URL, and metadata, but it does not store the HTML body or parsed tree on
 * `OpenNavPage`; later content artifact generators can read and convert one
 * page at a time when they actually need page content.
 */
export class HtmlPageReader {
  readonly #fileReader: EngineFileReader;
  readonly #pageUrlBuilder: PageUrlBuilder;

  public constructor(
    fileReader: EngineFileReader = new EngineFileReader(),
    pageUrlBuilder: PageUrlBuilder = new PageUrlBuilder(),
  ) {
    this.#fileReader = fileReader;
    this.#pageUrlBuilder = pageUrlBuilder;
  }

  /**
   * Reads one HTML file and returns metadata-only internal page data.
   *
   * @param input - Output directory, site base URL, and HTML file reference to read.
   * @returns Internal page metadata or a typed OpenNav AI error.
   */
  public async read(
    input: HtmlPageReadInput,
  ): Promise<Result<OpenNavPage, OpenNavError>> {
    if (input.fileReference.kind !== "html") {
      return err(this.createUnsupportedFileKindError(input.fileReference));
    }

    const fileResult = await this.#fileReader.read({
      outputDirectory: input.outputDirectory,
      filePath: input.fileReference.filePath,
    });

    if (fileResult.isErr()) {
      return err(fileResult.error);
    }

    const document = parse(fileResult.value.content);
    const pageUrl = this.#pageUrlBuilder.build({
      baseUrl: input.baseUrl,
      filePath: input.fileReference.filePath,
    });

    return ok({
      sourceFilePath: input.fileReference.filePath,
      sourceContentType: "html",
      route: pageUrl.route,
      canonicalUrl: pageUrl.canonicalUrl,
      title: this.extractTitle(document),
      description: this.extractDescription(document),
    });
  }

  private createUnsupportedFileKindError(
    fileReference: EngineFileReference,
  ): OpenNavError {
    return {
      code: "HTML_PAGE_READER_UNSUPPORTED_FILE_KIND",
      message: "The HTML page reader can only read HTML files.",
      context: {
        filePath: fileReference.filePath,
        kind: fileReference.kind,
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
