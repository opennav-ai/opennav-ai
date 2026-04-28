import { ok, type Result } from "neverthrow";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { PageMarkdownContentGenerateInput } from "../types/page-markdown-content-generate-input";
import type { PageMarkdownContentGenerateResult } from "../types/page-markdown-content-generate-result";
import { MarkdownLinkHrefRewriter } from "./markdown-link-href-rewriter";

/**
 * Converts one source page body into Markdown content for agent-readable files.
 */
export class PageMarkdownContentGenerator {
  readonly #linkHrefRewriter: MarkdownLinkHrefRewriter;

  /**
   * Creates a page content generator with the default link href rewriter.
   *
   * @param linkHrefRewriter - Rewrites known internal links to Markdown endpoints.
   */
  public constructor(
    linkHrefRewriter: MarkdownLinkHrefRewriter = new MarkdownLinkHrefRewriter(),
  ) {
    this.#linkHrefRewriter = linkHrefRewriter;
  }

  /**
   * Generates an in-memory Markdown body for one page.
   *
   * @param input - Page metadata and exact source file content to convert.
   * @returns Markdown content or a typed OpenNav AI error.
   */
  public generate(
    input: PageMarkdownContentGenerateInput,
  ): Result<PageMarkdownContentGenerateResult, OpenNavError> {
    if (input.page.sourceContentType === "markdown") {
      return ok({
        content: input.sourceContent,
      });
    }

    return ok({
      content: this.convertHtmlToMarkdown(input),
    });
  }

  private convertHtmlToMarkdown(
    input: PageMarkdownContentGenerateInput,
  ): string {
    const document = parse(input.sourceContent);
    const bodyElement =
      this.findFirstElement(
        document,
        (element: DefaultTreeAdapterTypes.Element): boolean =>
          element.tagName === "body",
      ) ?? document;
    const blocks = this.convertChildBlocks(bodyElement, input);

    if (blocks.length === 0) {
      return "";
    }

    return `${blocks.join("\n\n")}\n`;
  }

  private convertBlock(
    node: DefaultTreeAdapterTypes.Node,
    input: PageMarkdownContentGenerateInput,
  ): string | undefined {
    if (this.isTextNode(node)) {
      return this.normalizeText(node.value);
    }

    if (!this.isElement(node)) {
      return undefined;
    }

    if (this.isIgnoredElement(node)) {
      return undefined;
    }

    if (this.isHeadingElement(node)) {
      const headingText = this.normalizeText(
        this.convertInlineChildren(node, input),
      );

      if (headingText === undefined) {
        return undefined;
      }

      return `${"#".repeat(this.getHeadingLevel(node))} ${headingText}`;
    }

    if (node.tagName === "p") {
      return this.normalizeText(this.convertInlineChildren(node, input));
    }

    if (node.tagName === "ul" || node.tagName === "ol") {
      return this.convertList(node, input);
    }

    if (node.tagName === "li") {
      return this.normalizeText(this.convertInlineChildren(node, input));
    }

    if (node.tagName === "pre") {
      return this.convertPreformattedBlock(node);
    }

    const childBlocks = this.convertChildBlocks(node, input);

    if (childBlocks.length > 0) {
      return childBlocks.join("\n\n");
    }

    return this.normalizeText(this.convertInlineChildren(node, input));
  }

  private convertChildBlocks(
    node: DefaultTreeAdapterTypes.Node,
    input: PageMarkdownContentGenerateInput,
  ): readonly string[] {
    if (!this.isParentNode(node)) {
      return [];
    }

    const blocks: string[] = [];

    for (const childNode of node.childNodes) {
      const block = this.convertBlock(childNode, input);

      if (block !== undefined) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  private convertInline(
    node: DefaultTreeAdapterTypes.Node,
    input: PageMarkdownContentGenerateInput,
  ): string | undefined {
    if (this.isTextNode(node)) {
      return node.value;
    }

    if (!this.isElement(node) || this.isIgnoredElement(node)) {
      return undefined;
    }

    if (node.tagName === "a") {
      return this.convertLink(node, input);
    }

    if (node.tagName === "code") {
      return this.convertInlineCode(node);
    }

    if (node.tagName === "br") {
      return "\n";
    }

    return this.convertInlineChildren(node, input);
  }

  private convertInlineCode(
    element: DefaultTreeAdapterTypes.Element,
  ): string | undefined {
    const codeText = this.normalizeText(this.getTextContent(element));

    if (codeText === undefined) {
      return undefined;
    }

    return `\`${codeText}\``;
  }

  private convertInlineChildren(
    node: DefaultTreeAdapterTypes.Node,
    input: PageMarkdownContentGenerateInput,
  ): string {
    if (!this.isParentNode(node)) {
      return "";
    }

    return node.childNodes
      .map(
        (childNode: DefaultTreeAdapterTypes.ChildNode): string =>
          this.convertInline(childNode, input) ?? "",
      )
      .join("");
  }

  private convertList(
    element: DefaultTreeAdapterTypes.Element,
    input: PageMarkdownContentGenerateInput,
  ): string | undefined {
    if (!this.isParentNode(element)) {
      return undefined;
    }

    const listItems: string[] = [];
    let orderedItemNumber = 1;

    for (const childNode of element.childNodes) {
      if (!this.isElement(childNode) || childNode.tagName !== "li") {
        continue;
      }

      const itemText = this.normalizeText(
        this.convertInlineChildren(childNode, input),
      );

      if (itemText === undefined) {
        continue;
      }

      if (element.tagName === "ul") {
        listItems.push(`- ${itemText}`);
        continue;
      }

      listItems.push(`${orderedItemNumber}. ${itemText}`);
      orderedItemNumber += 1;
    }

    if (listItems.length === 0) {
      return undefined;
    }

    return listItems.join("\n");
  }

  private convertLink(
    element: DefaultTreeAdapterTypes.Element,
    input: PageMarkdownContentGenerateInput,
  ): string | undefined {
    const linkText = this.normalizeText(
      this.convertInlineChildren(element, input),
    );

    if (linkText === undefined) {
      return undefined;
    }

    const href = this.normalizeText(this.getAttributeValue(element, "href"));

    if (href === undefined) {
      return linkText;
    }

    const rewrittenHref = this.#linkHrefRewriter.rewrite({
      baseUrl: input.baseUrl,
      currentPage: input.page,
      pages: input.pages,
      href,
    });

    return `[${linkText}](${rewrittenHref.href})`;
  }

  private convertPreformattedBlock(
    element: DefaultTreeAdapterTypes.Element,
  ): string | undefined {
    const codeText = this.normalizeCodeBlockText(this.getTextContent(element));

    if (codeText === undefined) {
      return undefined;
    }

    return `\`\`\`txt\n${codeText}\n\`\`\``;
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

  private getHeadingLevel(element: DefaultTreeAdapterTypes.Element): number {
    return Number(element.tagName.slice(1));
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

  private isHeadingElement(element: DefaultTreeAdapterTypes.Element): boolean {
    return /^h[1-6]$/u.test(element.tagName);
  }

  private isIgnoredElement(element: DefaultTreeAdapterTypes.Element): boolean {
    return (
      element.tagName === "head" ||
      element.tagName === "meta" ||
      element.tagName === "script" ||
      element.tagName === "style" ||
      element.tagName === "title"
    );
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

  private normalizeCodeBlockText(value: string): string | undefined {
    const normalizedValue = value
      .replace(/\r\n?/gu, "\n")
      .replace(/^\n+/u, "")
      .replace(/\n+$/u, "");

    if (normalizedValue.trim() === "") {
      return undefined;
    }

    return normalizedValue;
  }
}
