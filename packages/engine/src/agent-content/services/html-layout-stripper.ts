import type { DefaultTreeAdapterTypes, Token } from "parse5";

const STRIPPED_TAG_NAMES = new Set<string>([
  "aside",
  "footer",
  "header",
  "nav",
  "search",
  "site-search",
]);

const STRIPPED_ROLE_VALUES = new Set<string>([
  "complementary",
  "navigation",
  "search",
]);

/**
 * Removes documented repeated layout elements from a parsed HTML body.
 */
export class HtmlLayoutStripper {
  /**
   * Mutates one parsed HTML body element by removing documented layout nodes.
   *
   * @param bodyElement - The parsed `<body>` element whose children should be pruned.
   * @returns Nothing; matching child nodes are detached from the supplied parse5 tree.
   */
  public strip(bodyElement: DefaultTreeAdapterTypes.Element): void {
    this.stripChildren(bodyElement);
  }

  private getAttributeValue(
    element: DefaultTreeAdapterTypes.Element,
    name: string,
  ): string | undefined {
    const attribute = element.attrs.find(
      (candidate: Token.Attribute): boolean => candidate.name === name,
    );

    return attribute?.value;
  }

  private getElementText(element: DefaultTreeAdapterTypes.Element): string {
    let text = "";

    for (const childNode of element.childNodes) {
      if (this.isTextNode(childNode)) {
        text = `${text}${childNode.value}`;
        continue;
      }

      if (this.isElement(childNode)) {
        text = `${text}${this.getElementText(childNode)}`;
      }
    }

    return text;
  }

  private hasAttribute(
    element: DefaultTreeAdapterTypes.Element,
    name: string,
  ): boolean {
    return element.attrs.some(
      (candidate: Token.Attribute): boolean => candidate.name === name,
    );
  }

  private isElement(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.Element {
    return "tagName" in node;
  }

  private isLayoutElement(element: DefaultTreeAdapterTypes.Element): boolean {
    if (STRIPPED_TAG_NAMES.has(element.tagName)) {
      return true;
    }

    if (this.hasAttribute(element, "data-pagefind-ignore")) {
      return true;
    }

    const role = this.getAttributeValue(element, "role");

    if (role === undefined) {
      return false;
    }

    return STRIPPED_ROLE_VALUES.has(role.toLowerCase());
  }

  private isParentNode(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.ParentNode {
    return "childNodes" in node;
  }

  private isSkipLink(element: DefaultTreeAdapterTypes.Element): boolean {
    if (element.tagName !== "a") {
      return false;
    }

    const href = this.getAttributeValue(element, "href");

    if (href?.startsWith("#") !== true) {
      return false;
    }

    return this.normalizeVisibleText(this.getElementText(element)).startsWith(
      "skip to",
    );
  }

  private isTextNode(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.TextNode {
    return node.nodeName === "#text";
  }

  private normalizeVisibleText(value: string): string {
    return value.replace(/\s+/gu, " ").trim().toLowerCase();
  }

  private shouldStripNode(node: DefaultTreeAdapterTypes.Node): boolean {
    if (!this.isElement(node)) {
      return false;
    }

    return this.isLayoutElement(node) || this.isSkipLink(node);
  }

  private stripChildren(parent: DefaultTreeAdapterTypes.ParentNode): void {
    const retainedChildNodes: DefaultTreeAdapterTypes.ChildNode[] = [];

    for (const childNode of parent.childNodes) {
      if (this.shouldStripNode(childNode)) {
        this.detachNode(childNode);
        continue;
      }

      if (this.isParentNode(childNode)) {
        this.stripChildren(childNode);
      }

      retainedChildNodes.push(childNode);
    }

    parent.childNodes = retainedChildNodes;
  }

  private detachNode(node: DefaultTreeAdapterTypes.ChildNode): void {
    if ("parentNode" in node) {
      node.parentNode = null;
    }
  }
}
