declare module "turndown" {
  /**
   * Formatting knobs used while converting HTML into Markdown text.
   */
  export interface TurndownOptions {
    /**
     * Markdown syntax used for HTML headings.
     */
    readonly headingStyle?: "setext" | "atx";

    /**
     * Markdown text emitted for `<hr>` elements.
     */
    readonly hr?: string;

    /**
     * Marker emitted before unordered list items.
     */
    readonly bulletListMarker?: "-" | "+" | "*";

    /**
     * Markdown syntax used for HTML `<pre><code>` blocks.
     */
    readonly codeBlockStyle?: "indented" | "fenced";

    /**
     * Fence sequence emitted around code blocks.
     */
    readonly fence?: "```" | "~~~";

    /**
     * Delimiter emitted around emphasis text.
     */
    readonly emDelimiter?: "_" | "*";

    /**
     * Delimiter emitted around strong text.
     */
    readonly strongDelimiter?: "__" | "**";

    /**
     * Markdown syntax used for links.
     */
    readonly linkStyle?: "inlined" | "referenced";

    /**
     * Markdown reference style used when `linkStyle` is `referenced`.
     */
    readonly linkReferenceStyle?: "full" | "collapsed" | "shortcut";

    /**
     * Whether whitespace inside preformatted code is preserved by default.
     */
    readonly preformattedCode?: boolean;
  }

  /**
   * DOM-like node shape Turndown passes to rule filters and replacements.
   */
  export interface TurndownElement {
    /**
     * Uppercase HTML node name such as `A`, `PRE`, or `CODE`.
     */
    readonly nodeName: string;

    /**
     * Text content decoded from the current node and its descendants.
     */
    readonly textContent: string;

    /**
     * First child node when the element has children.
     */
    readonly firstChild: TurndownElement | null;

    /**
     * Parent node that contains the current element.
     */
    readonly parentNode: TurndownElement | null;

    /**
     * Element children used to calculate ordered-list item numbers.
     */
    readonly children: ArrayLike<TurndownElement>;

    /**
     * Next sibling node used to decide whether a list item needs a trailing newline.
     */
    readonly nextSibling: TurndownElement | null;

    /**
     * Last element child used by Turndown's list handling.
     */
    readonly lastElementChild: TurndownElement | null;

    /**
     * Reads an HTML attribute from this element.
     *
     * @param name - Attribute name to inspect.
     * @returns Attribute value when present, otherwise `null`.
     */
    getAttribute(name: string): string | null;
  }

  /**
   * Rule predicate that chooses which HTML elements a conversion rule handles.
   */
  export type TurndownFilter =
    | string
    | readonly string[]
    | ((node: TurndownElement, options: TurndownOptions) => boolean);

  /**
   * Rule body that returns the Markdown text for one matched element.
   */
  export type TurndownReplacement = (
    content: string,
    node: TurndownElement,
    options: TurndownOptions,
  ) => string;

  /**
   * Conversion rule registered with a Turndown service instance.
   */
  export interface TurndownRule {
    /**
     * Element selector or predicate that decides when this rule runs.
     */
    readonly filter: TurndownFilter;

    /**
     * Converts matched element content into Markdown text.
     */
    readonly replacement: TurndownReplacement;
  }

  /**
   * Plugin function that can register several Turndown rules.
   */
  export type TurndownPlugin = (service: TurndownService) => void;

  /**
   * HTML-to-Markdown converter configured with CommonMark and custom rules.
   */
  export default class TurndownService {
    /**
     * Creates a converter with optional Markdown formatting preferences.
     *
     * @param options - Formatting options used by built-in and custom rules.
     */
    public constructor(options?: TurndownOptions);

    /**
     * Registers a custom conversion rule.
     *
     * @param key - Stable rule identifier.
     * @param rule - Rule predicate and Markdown replacement.
     * @returns This service for chaining.
     */
    public addRule(key: string, rule: TurndownRule): this;

    /**
     * Removes matching elements from generated Markdown.
     *
     * @param filter - Element selector or predicate to remove.
     * @returns This service for chaining.
     */
    public remove(filter: TurndownFilter): this;

    /**
     * Applies one or more rule plugins.
     *
     * @param plugin - Plugin or plugins to register.
     * @returns This service for chaining.
     */
    public use(plugin: TurndownPlugin | readonly TurndownPlugin[]): this;

    /**
     * Converts an HTML string or DOM-like element into Markdown.
     *
     * @param html - HTML source or DOM-like node to convert.
     * @returns Markdown text without a guaranteed trailing newline.
     */
    public turndown(html: string | TurndownElement): string;
  }
}
