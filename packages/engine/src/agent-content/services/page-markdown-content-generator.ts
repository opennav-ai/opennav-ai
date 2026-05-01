/// <reference path="../types/turndown-module.d.ts" />
/// <reference path="../types/turndown-plugin-gfm-module.d.ts" />

import { ok, type Result } from "neverthrow";
import { type DefaultTreeAdapterTypes, parse, serialize } from "parse5";
import TurndownService, {
  type TurndownElement,
  type TurndownOptions,
} from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { PageMarkdownContentGenerateInput } from "../types/page-markdown-content-generate-input";
import type { PageMarkdownContentGenerateResult } from "../types/page-markdown-content-generate-result";
import { HtmlLayoutStripper } from "./html-layout-stripper";
import { MarkdownLinkHrefRewriter } from "./markdown-link-href-rewriter";

/**
 * Converts one source page body into Markdown content for agent-readable files.
 */
export class PageMarkdownContentGenerator {
  readonly #linkHrefRewriter: MarkdownLinkHrefRewriter;
  readonly #layoutStripper: HtmlLayoutStripper;

  /**
   * Creates a page content generator with the default link href rewriter.
   *
   * @param linkHrefRewriter - Rewrites known internal links to Markdown endpoints.
   * @param layoutStripper - Removes documented layout elements from parsed HTML bodies.
   */
  public constructor(
    linkHrefRewriter: MarkdownLinkHrefRewriter = new MarkdownLinkHrefRewriter(),
    layoutStripper: HtmlLayoutStripper = new HtmlLayoutStripper(),
  ) {
    this.#linkHrefRewriter = linkHrefRewriter;
    this.#layoutStripper = layoutStripper;
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

  private addCodeBlockRule(service: TurndownService): void {
    service.addRule("opennavCodeBlock", {
      filter: (node: TurndownElement): boolean =>
        node.nodeName === "PRE" && this.isCodeElement(node.firstChild),
      replacement: (
        _content: string,
        node: TurndownElement,
        options: TurndownOptions,
      ): string => this.convertCodeBlock(node, options),
    });
  }

  private addLinkRule(
    service: TurndownService,
    input: PageMarkdownContentGenerateInput,
  ): void {
    service.addRule("opennavInlineLink", {
      filter: (node: TurndownElement): boolean => node.nodeName === "A",
      replacement: (content: string, node: TurndownElement): string =>
        this.convertLink(content, node, input),
    });
  }

  private addListItemRule(service: TurndownService): void {
    service.addRule("opennavListItem", {
      filter: "li",
      replacement: (
        content: string,
        node: TurndownElement,
        options: TurndownOptions,
      ): string => this.convertListItem(content, node, options),
    });
  }

  private addStrikethroughRule(service: TurndownService): void {
    service.addRule("opennavStrikethrough", {
      filter: ["del", "s", "strike"],
      replacement: (content: string): string => {
        if (content.trim() === "") {
          return "";
        }

        return `~~${content}~~`;
      },
    });
  }

  private buildCodeFence(
    configuredFence: string | undefined,
    code: string,
  ): string {
    const fenceCharacter = configuredFence?.charAt(0) === "~" ? "~" : "`";
    const fenceInCodeRegex = new RegExp(
      `^${this.escapeRegExp(fenceCharacter)}{3,}`,
      "gmu",
    );
    let fenceSize = 3;
    let match = fenceInCodeRegex.exec(code);

    while (match !== null) {
      const matchedFence = match[0];

      if (matchedFence.length >= fenceSize) {
        fenceSize = matchedFence.length + 1;
      }

      match = fenceInCodeRegex.exec(code);
    }

    return fenceCharacter.repeat(fenceSize);
  }

  private convertCodeBlock(
    element: TurndownElement,
    options: TurndownOptions,
  ): string {
    const codeElement = this.getFirstCodeElement(element);

    if (codeElement === undefined) {
      return "";
    }

    const codeText = this.normalizeCodeBlockText(codeElement.textContent);

    if (codeText === undefined) {
      return "";
    }

    const language = this.getCodeBlockLanguage(codeElement) ?? "txt";
    const fence = this.buildCodeFence(options.fence, codeText);

    return `\n\n${fence}${language}\n${codeText}\n${fence}\n\n`;
  }

  private convertHtmlToMarkdown(
    input: PageMarkdownContentGenerateInput,
  ): string {
    const markdown = this.normalizeMarkdownWhitespace(
      this.createTurndownService(input).turndown(
        this.getConvertibleHtml(input),
      ),
    ).trimEnd();

    if (markdown === "") {
      return "";
    }

    return `${markdown}\n`;
  }

  private convertLink(
    content: string,
    element: TurndownElement,
    input: PageMarkdownContentGenerateInput,
  ): string {
    const linkText = this.normalizeText(content);

    if (linkText === undefined) {
      return "";
    }

    const href = this.normalizeText(
      this.getTurndownAttributeValue(element, "href"),
    );

    if (href === undefined) {
      return linkText;
    }

    const rewrittenHref = this.#linkHrefRewriter.rewrite({
      baseUrl: input.baseUrl,
      currentPage: input.page,
      pages: input.pages,
      href,
    });
    const markdownLink = `[${linkText}](${rewrittenHref.href})`;

    if (this.isStandaloneLinkBlock(element)) {
      return `\n\n${markdownLink}\n\n`;
    }

    return markdownLink;
  }

  private convertListItem(
    content: string,
    element: TurndownElement,
    options: TurndownOptions,
  ): string {
    const prefix = this.getListItemPrefix(element, options);
    const contentEndsWithNewline = /\n$/u.test(content);
    const trimmedContent = this.trimNewlines(content);
    const paragraphContent = contentEndsWithNewline
      ? `${trimmedContent}\n`
      : trimmedContent;
    const indentedContent = paragraphContent.replaceAll(
      "\n",
      `\n${" ".repeat(prefix.length)}`,
    );

    return `${prefix}${indentedContent}${element.nextSibling === null ? "" : "\n"}`;
  }

  private createTurndownService(
    input: PageMarkdownContentGenerateInput,
  ): TurndownService {
    const service = new TurndownService({
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
      fence: "```",
      headingStyle: "atx",
      hr: "---",
      linkStyle: "inlined",
      strongDelimiter: "**",
    });

    service.use(gfm);
    service.remove(["head", "meta", "script", "style", "title"]);
    this.addLinkRule(service, input);
    this.addCodeBlockRule(service);
    this.addStrikethroughRule(service);
    this.addListItemRule(service);

    return service;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
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

  private getChildElementIndex(
    parent: TurndownElement,
    child: TurndownElement,
  ): number {
    return Array.from(parent.children).findIndex(
      (candidate: TurndownElement): boolean => candidate === child,
    );
  }

  private getCodeBlockLanguage(element: TurndownElement): string | undefined {
    const classAttribute = this.getTurndownAttributeValue(element, "class");
    const classLanguage = this.getCodeBlockLanguageFromClass(classAttribute);

    if (classLanguage !== undefined) {
      return classLanguage;
    }

    return (
      this.normalizeText(
        this.getTurndownAttributeValue(element, "data-language"),
      ) ??
      this.normalizeText(this.getTurndownAttributeValue(element, "data-lang"))
    );
  }

  private getCodeBlockLanguageFromClass(
    classAttribute: string | undefined,
  ): string | undefined {
    if (classAttribute === undefined) {
      return undefined;
    }

    const classes = classAttribute.split(/\s+/u);

    for (const className of classes) {
      const languageMatch = /^(?:language|lang)-(.+)$/u.exec(className);

      if (languageMatch === null) {
        continue;
      }

      return languageMatch[1];
    }

    return undefined;
  }

  private getConvertibleHtml(input: PageMarkdownContentGenerateInput): string {
    const document = parse(input.sourceContent);
    const bodyElement = this.findFirstElement(
      document,
      (element: DefaultTreeAdapterTypes.Element): boolean =>
        element.tagName === "body",
    );

    if (bodyElement === undefined) {
      return input.sourceContent;
    }

    if (input.contentExtraction?.stripLayout === true) {
      this.#layoutStripper.strip(bodyElement);
    }

    return serialize(bodyElement);
  }

  private getFirstCodeElement(
    element: TurndownElement,
  ): TurndownElement | undefined {
    const firstChild = element.firstChild;

    if (!this.isCodeElement(firstChild)) {
      return undefined;
    }

    return firstChild;
  }

  private getListItemPrefix(
    element: TurndownElement,
    options: TurndownOptions,
  ): string {
    const parent = element.parentNode;

    if (parent?.nodeName !== "OL") {
      return `${options.bulletListMarker ?? "-"} `;
    }

    const startAttribute = this.getTurndownAttributeValue(parent, "start");
    const parsedStart =
      startAttribute === undefined ? Number.NaN : Number(startAttribute);
    const listStart = Number.isFinite(parsedStart) ? parsedStart : 1;
    const childIndex = this.getChildElementIndex(parent, element);
    const itemIndex = childIndex === -1 ? 0 : childIndex;

    return `${listStart + itemIndex}. `;
  }

  private getTurndownAttributeValue(
    element: TurndownElement,
    attributeName: string,
  ): string | undefined {
    return element.getAttribute(attributeName) ?? undefined;
  }

  private isCodeElement(
    element: TurndownElement | null,
  ): element is TurndownElement {
    return element?.nodeName === "CODE";
  }

  private isStandaloneLinkBlock(element: TurndownElement): boolean {
    const parent = element.parentNode;

    if (parent === null) {
      return false;
    }

    return [
      "ARTICLE",
      "ASIDE",
      "BODY",
      "DIV",
      "FOOTER",
      "HEADER",
      "MAIN",
      "NAV",
      "SECTION",
      "X-TURNDOWN",
    ].includes(parent.nodeName);
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

  private normalizeMarkdownWhitespace(value: string): string {
    const normalizedLines: string[] = [];
    let activeFence: string | undefined;
    let previousLineWasBlank = false;

    for (const line of value.replace(/\r\n?/gu, "\n").split("\n")) {
      if (activeFence !== undefined) {
        normalizedLines.push(line);
        previousLineWasBlank = false;

        if (line.trim() === activeFence) {
          activeFence = undefined;
        }

        continue;
      }

      const trimmedLine = line.trimEnd();
      const fenceMarker = this.getMarkdownFenceMarker(trimmedLine);

      if (fenceMarker !== undefined) {
        activeFence = fenceMarker;
        normalizedLines.push(trimmedLine);
        previousLineWasBlank = false;
        continue;
      }

      if (trimmedLine.trim() === "") {
        if (!previousLineWasBlank) {
          normalizedLines.push("");
        }

        previousLineWasBlank = true;
        continue;
      }

      normalizedLines.push(trimmedLine);
      previousLineWasBlank = false;
    }

    return normalizedLines.join("\n");
  }

  private getMarkdownFenceMarker(line: string): string | undefined {
    const fenceMatch = /^(`{3,}|~{3,})/u.exec(line);

    return fenceMatch?.[1];
  }

  private trimNewlines(value: string): string {
    return value.replace(/^\n+/u, "").replace(/\n+$/u, "");
  }
}
