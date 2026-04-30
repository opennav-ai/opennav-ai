import { createHash } from "node:crypto";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import type { BuildContentFingerprintInput } from "../types/build-content-fingerprint-input";
import type { BuildFingerprintFileInput } from "../types/build-fingerprint-file-input";
import type { BuildFingerprintInput } from "../types/build-fingerprint-input";

const SHORT_FINGERPRINT_DIGEST_LENGTH = 12;

interface SourceRange {
  readonly endOffset: number;
  readonly startOffset: number;
}

interface HtmlAttribute {
  readonly name: string;
  readonly value: string;
}

/**
 * Builds deterministic fingerprints for OpenNav-generated artifacts.
 */
export class BuildFingerprintBuilder {
  /**
   * Builds a deterministic SHA-256 fingerprint for one engine run.
   *
   * @param input - Normalized run settings, source file fingerprints, and optional access guidance.
   * @returns Fingerprint in `sha256:<hex>` format.
   */
  public buildBuildFingerprint(input: BuildFingerprintInput): string {
    const normalizedInput = {
      baseUrl: input.baseUrl,
      contentSignals: [...(input.contentSignals ?? [])].sort(),
      siteName: input.siteName,
      sourceFiles: [...input.sourceFiles]
        .sort(
          (
            firstFile: BuildFingerprintFileInput,
            secondFile: BuildFingerprintFileInput,
          ): number => firstFile.filePath.localeCompare(secondFile.filePath),
        )
        .map(
          (
            fileInput: BuildFingerprintFileInput,
          ): {
            readonly contentFingerprint: string;
            readonly filePath: string;
          } => ({
            contentFingerprint: fileInput.contentFingerprint,
            filePath: fileInput.filePath,
          }),
        ),
    };

    return this.buildContentFingerprint({
      content: JSON.stringify(normalizedInput),
    });
  }

  /**
   * Builds a SHA-256 fingerprint for source or generated content.
   *
   * @param input - Exact content string, or content plus source kind for normalization.
   * @returns Fingerprint in `sha256:<hex>` format.
   */
  public buildContentFingerprint(
    input: string | BuildContentFingerprintInput,
  ): string {
    const content =
      typeof input === "string"
        ? input
        : this.normalizeContentForFingerprint(input);

    return `sha256:${createHash("sha256")
      .update(content, "utf8")
      .digest("hex")}`;
  }

  /**
   * Builds a short display fingerprint from an existing full fingerprint.
   *
   * @param fingerprint - Full fingerprint in `algorithm:<hex>` format.
   * @returns Fingerprint with the original algorithm and first 12 digest characters.
   */
  public buildShortFingerprint(fingerprint: string): string {
    const digestStartIndex = fingerprint.indexOf(":") + 1;

    if (digestStartIndex === 0) {
      return fingerprint.slice(0, SHORT_FINGERPRINT_DIGEST_LENGTH);
    }

    return `${fingerprint.slice(0, digestStartIndex)}${fingerprint.slice(
      digestStartIndex,
      digestStartIndex + SHORT_FINGERPRINT_DIGEST_LENGTH,
    )}`;
  }

  private expandRangeThroughFollowingBlankLines(
    content: string,
    range: SourceRange,
  ): SourceRange {
    let endOffset = range.endOffset;

    while (endOffset < content.length) {
      const nextNewlineOffset = content.indexOf("\n", endOffset);
      const nextLineEndOffset =
        nextNewlineOffset === -1 ? content.length : nextNewlineOffset + 1;
      const nextLine = content.slice(endOffset, nextLineEndOffset);

      if (!/^[\t ]*\r?\n$/u.test(nextLine)) {
        break;
      }

      endOffset = nextLineEndOffset;
    }

    return {
      startOffset: range.startOffset,
      endOffset,
    };
  }

  private expandRangeToWholeLine(
    content: string,
    range: SourceRange,
  ): SourceRange {
    let startOffset = range.startOffset;
    let endOffset = range.endOffset;

    while (startOffset > 0 && content[startOffset - 1] !== "\n") {
      startOffset -= 1;
    }

    while (endOffset < content.length && content[endOffset] !== "\n") {
      endOffset += 1;
    }

    if (endOffset < content.length) {
      endOffset += 1;
    }

    return {
      startOffset,
      endOffset,
    };
  }

  private findLineEndOffset(content: string, offset: number): number {
    const nextNewlineOffset = content.indexOf("\n", offset);

    return nextNewlineOffset === -1 ? content.length : nextNewlineOffset + 1;
  }

  private findLineStartOffset(content: string, offset: number): number {
    const previousNewlineOffset = content.lastIndexOf("\n", offset);

    return previousNewlineOffset === -1 ? 0 : previousNewlineOffset + 1;
  }

  private findManagedResourceLinkRanges(
    node: DefaultTreeAdapterTypes.Node,
    sourceContent: string,
  ): readonly SourceRange[] {
    const ranges: SourceRange[] = [];

    if (this.isManagedResourceLinkElement(node)) {
      const location = node.sourceCodeLocation;

      if (location !== undefined && location !== null) {
        ranges.push(
          this.expandRangeToWholeLine(sourceContent, {
            startOffset: location.startOffset,
            endOffset: location.endOffset,
          }),
        );
      }
    }

    if (!this.isParentNode(node)) {
      return ranges;
    }

    for (const childNode of node.childNodes) {
      ranges.push(
        ...this.findManagedResourceLinkRanges(childNode, sourceContent),
      );
    }

    return ranges;
  }

  private getHtmlAttribute(
    element: DefaultTreeAdapterTypes.Element,
    name: string,
  ): string | undefined {
    return element.attrs.find(
      (attribute: HtmlAttribute): boolean =>
        attribute.name.toLowerCase() === name,
    )?.value;
  }

  private isElement(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.Element {
    return "tagName" in node;
  }

  private isManagedResourceLinkElement(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.Element {
    if (!this.isElement(node) || node.tagName !== "link") {
      return false;
    }

    return (
      this.getHtmlAttribute(node, "data-opennav") === "resource-link" ||
      this.getHtmlAttribute(node, "data-opennav-sha")?.startsWith("sha256:") ===
        true
    );
  }

  private isParentNode(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.ParentNode {
    return "childNodes" in node;
  }

  private mergeSourceRanges(
    ranges: readonly SourceRange[],
  ): readonly SourceRange[] {
    const sortedRanges = [...ranges].sort(
      (firstRange: SourceRange, secondRange: SourceRange): number =>
        firstRange.startOffset - secondRange.startOffset,
    );
    const mergedRanges: SourceRange[] = [];

    for (const range of sortedRanges) {
      const previousRange = mergedRanges.at(-1);

      if (
        previousRange !== undefined &&
        range.startOffset <= previousRange.endOffset
      ) {
        mergedRanges[mergedRanges.length - 1] = {
          startOffset: previousRange.startOffset,
          endOffset: Math.max(previousRange.endOffset, range.endOffset),
        };
        continue;
      }

      mergedRanges.push(range);
    }

    return mergedRanges;
  }

  private normalizeContentForFingerprint(
    input: BuildContentFingerprintInput,
  ): string {
    if (input.sourceContentKind === "html") {
      return this.stripOpenNavManagedHtmlResourceLinks(input.content);
    }

    if (input.sourceContentKind === "robots") {
      return this.stripOpenNavManagedRobotsBlock(input.content);
    }

    return input.content;
  }

  private removeSourceRanges(
    content: string,
    ranges: readonly SourceRange[],
  ): string {
    let nextContent = content;

    for (const range of [...ranges].sort(
      (firstRange: SourceRange, secondRange: SourceRange): number =>
        secondRange.startOffset - firstRange.startOffset,
    )) {
      nextContent = `${nextContent.slice(
        0,
        range.startOffset,
      )}${nextContent.slice(range.endOffset)}`;
    }

    return nextContent;
  }

  private stripOpenNavManagedHtmlResourceLinks(content: string): string {
    const document = parse(content, {
      sourceCodeLocationInfo: true,
    });
    const ranges = this.mergeSourceRanges(
      this.mergeSourceRanges(
        this.findManagedResourceLinkRanges(document, content),
      ).map(
        (range: SourceRange): SourceRange =>
          this.expandRangeThroughFollowingBlankLines(content, range),
      ),
    );

    if (ranges.length === 0) {
      return content;
    }

    return this.removeSourceRanges(content, ranges);
  }

  private stripOpenNavManagedRobotsBlock(content: string): string {
    const beginMarker = "# Begin OpenNav AI";
    const endMarker = "# End OpenNav AI";
    const startOffset = content.indexOf(beginMarker);

    if (startOffset === -1) {
      return content;
    }

    const endMarkerOffset = content.indexOf(endMarker, startOffset);

    if (endMarkerOffset === -1) {
      return content;
    }

    const startLineOffset = this.findLineStartOffset(content, startOffset);
    const endLineOffset = this.findLineEndOffset(
      content,
      endMarkerOffset + endMarker.length,
    );

    return `${content.slice(0, startLineOffset)}${content.slice(
      endLineOffset,
    )}`;
  }
}
