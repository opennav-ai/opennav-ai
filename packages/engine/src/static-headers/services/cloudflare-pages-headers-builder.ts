import { BuildFingerprintCommentBuilder } from "../../build-fingerprint/services/build-fingerprint-comment-builder";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";

const CLOUDFLARE_HEADERS_OUTPUT_FILE_PATH: EngineFilePath = "_headers";
const OPENNAV_BLOCK_BEGIN_MARKER = "# Begin OpenNav AI";
const OPENNAV_BLOCK_END_MARKER = "# End OpenNav AI";
const OPENNAV_EXACT_HEADER_TARGETS: readonly string[] = [
  "/llms.txt",
  "/llms-full.txt",
  "/.well-known/llms.txt",
  "/.well-known/llms-full.txt",
  "/.well-known/opennav.json",
];
const OPENNAV_MARKDOWN_HEADER_PATTERN = "/*.md";

interface CloudflarePagesHeadersBuildInput {
  readonly buildFingerprint: string;
  readonly existingContent?: string | undefined;
}

interface CloudflarePagesHeadersBuildResult {
  readonly files: readonly CloudflarePagesHeadersFile[];
  readonly warnings: readonly OpenNavError[];
}

interface CloudflarePagesHeadersFile {
  readonly outputFilePath: EngineFilePath;
  readonly content: string;
}

interface HeaderRule {
  readonly pattern: string;
}

interface ManagedBlockScanResult {
  readonly beginMarkerCount: number;
  readonly blockContent?: string | undefined;
  readonly endMarkerCount: number;
  readonly endOffset?: number | undefined;
  readonly startOffset?: number | undefined;
}

interface CloudflarePagesHeadersBuilderDependencies {
  readonly buildFingerprintCommentBuilder?: BuildFingerprintCommentBuilder;
}

/**
 * Plans Cloudflare Pages `_headers` content for OpenNav static artifacts.
 */
export class CloudflarePagesHeadersBuilder {
  readonly #buildFingerprintCommentBuilder: BuildFingerprintCommentBuilder;

  /**
   * Creates a builder with default managed-block comment formatting.
   *
   * @param dependencies - Optional collaborators for focused tests.
   */
  public constructor(
    dependencies: CloudflarePagesHeadersBuilderDependencies = {},
  ) {
    this.#buildFingerprintCommentBuilder =
      dependencies.buildFingerprintCommentBuilder ??
      new BuildFingerprintCommentBuilder();
  }

  /**
   * Creates or updates the OpenNav-managed Cloudflare Pages `_headers` block.
   *
   * @param input - Build fingerprint and optional existing `_headers` content.
   * @returns Planned `_headers` content with non-fatal warnings.
   */
  public build(
    input: CloudflarePagesHeadersBuildInput,
  ): CloudflarePagesHeadersBuildResult {
    const managedBlock = this.scanManagedBlock(input.existingContent ?? "");

    if (!this.isManagedBlockValid(managedBlock)) {
      return {
        files: [],
        warnings: [
          this.createManagedBlockInvalidWarning(
            managedBlock.beginMarkerCount,
            managedBlock.endMarkerCount,
          ),
        ],
      };
    }

    const contentOutsideManagedBlock = this.removeManagedBlock(
      input.existingContent ?? "",
      managedBlock,
    );
    const conflictingRules = this.findConflictingRouteRules(
      contentOutsideManagedBlock,
    );

    if (conflictingRules.length > 0) {
      return {
        files: [],
        warnings: [this.createRouteConflictWarning(conflictingRules)],
      };
    }

    const content =
      managedBlock.blockContent === undefined
        ? this.appendManagedBlock(input, input.existingContent ?? "")
        : this.replaceManagedBlock(
            input,
            input.existingContent ?? "",
            managedBlock,
          );

    if (content === (input.existingContent ?? "")) {
      return {
        files: [],
        warnings: [],
      };
    }

    return {
      files: [
        {
          outputFilePath: CLOUDFLARE_HEADERS_OUTPUT_FILE_PATH,
          content,
        },
      ],
      warnings: [],
    };
  }

  private appendManagedBlock(
    input: CloudflarePagesHeadersBuildInput,
    existingContent: string,
  ): string {
    return `${existingContent}${this.buildAppendPrefix(
      existingContent,
    )}${this.createManagedBlock(input.buildFingerprint)}`;
  }

  private buildAppendPrefix(existingContent: string): string {
    if (existingContent.length === 0) {
      return "";
    }

    if (existingContent.endsWith("\n")) {
      return "\n";
    }

    return "\n\n";
  }

  private createRouteConflictWarning(
    conflictingRules: readonly string[],
  ): OpenNavError {
    return {
      code: "STATIC_HEADERS_ROUTE_CONFLICT",
      message:
        "Existing _headers route rules overlap with OpenNav static headers.",
      context: {
        filePath: CLOUDFLARE_HEADERS_OUTPUT_FILE_PATH,
        conflictingRules,
      },
    };
  }

  private createManagedBlock(buildFingerprint: string): string {
    const marker = this.#buildFingerprintCommentBuilder.build({
      format: "line-comment",
      buildFingerprint,
    });

    return `${OPENNAV_BLOCK_BEGIN_MARKER}
${marker.content}/*.md
  Content-Type: text/markdown; charset=utf-8
  X-Content-Type-Options: nosniff

/llms.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/llms.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/opennav.json
  Content-Type: application/json; charset=utf-8
  X-Content-Type-Options: nosniff
${OPENNAV_BLOCK_END_MARKER}
`;
  }

  private createManagedBlockInvalidWarning(
    beginMarkerCount: number,
    endMarkerCount: number,
  ): OpenNavError {
    return {
      code: "STATIC_HEADERS_OPENNAV_MANAGED_BLOCK_INVALID",
      message: "Existing _headers contains an invalid OpenNav managed block.",
      context: {
        filePath: CLOUDFLARE_HEADERS_OUTPUT_FILE_PATH,
        beginMarkerCount,
        endMarkerCount,
      },
    };
  }

  private countMarker(content: string, marker: string): number {
    let count = 0;
    let offset = content.indexOf(marker);

    while (offset !== -1) {
      count += 1;
      offset = content.indexOf(marker, offset + marker.length);
    }

    return count;
  }

  private findConflictingRouteRules(content: string): readonly string[] {
    return this.parseRules(content)
      .filter((rule: HeaderRule): boolean =>
        this.canOverlapOpenNavHeaderTargets(rule.pattern),
      )
      .map((rule: HeaderRule): string => rule.pattern);
  }

  private findLineEndOffset(content: string, markerEndOffset: number): number {
    const nextNewlineOffset = content.indexOf("\n", markerEndOffset);

    if (nextNewlineOffset === -1) {
      return content.length;
    }

    return nextNewlineOffset + 1;
  }

  private canOverlapOpenNavHeaderTargets(pattern: string): boolean {
    return (
      this.patternMatchesTarget(pattern, OPENNAV_MARKDOWN_HEADER_PATTERN) ||
      OPENNAV_EXACT_HEADER_TARGETS.some((target: string): boolean =>
        this.patternMatchesTarget(pattern, target),
      )
    );
  }

  private isManagedBlockValid(scanResult: ManagedBlockScanResult): boolean {
    return (
      scanResult.beginMarkerCount === scanResult.endMarkerCount &&
      scanResult.beginMarkerCount <= 1 &&
      scanResult.endMarkerCount <= 1
    );
  }

  private isRuleLine(line: string): boolean {
    const trimmedLine = line.trim();

    return (
      trimmedLine !== "" &&
      !trimmedLine.startsWith("#") &&
      !/^[ \t]/u.test(line)
    );
  }

  private parseRules(content: string): readonly HeaderRule[] {
    const rules: HeaderRule[] = [];
    let activePattern: string | undefined;

    for (const line of content.split(/\r?\n/u)) {
      if (this.isRuleLine(line)) {
        this.pushRule(rules, activePattern);
        activePattern = line.trim();
      }
    }

    this.pushRule(rules, activePattern);

    return rules;
  }

  private patternMatchesTarget(pattern: string, target: string): boolean {
    if (pattern === target) {
      return true;
    }

    if (!pattern.includes("*")) {
      return false;
    }

    const wildcardPattern = `^${this.escapeRegExp(pattern).replace(
      /\\\*/gu,
      ".*",
    )}$`;

    return new RegExp(wildcardPattern, "u").test(target);
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  }

  private pushRule(rules: HeaderRule[], pattern: string | undefined): void {
    if (pattern === undefined) {
      return;
    }

    rules.push({
      pattern,
    });
  }

  private removeManagedBlock(
    headersContent: string,
    managedBlock: ManagedBlockScanResult,
  ): string {
    if (
      managedBlock.startOffset === undefined ||
      managedBlock.endOffset === undefined
    ) {
      return headersContent;
    }

    return `${headersContent.slice(
      0,
      managedBlock.startOffset,
    )}${headersContent.slice(managedBlock.endOffset)}`;
  }

  private replaceManagedBlock(
    input: CloudflarePagesHeadersBuildInput,
    existingContent: string,
    managedBlock: ManagedBlockScanResult,
  ): string {
    if (
      managedBlock.startOffset === undefined ||
      managedBlock.endOffset === undefined
    ) {
      return existingContent;
    }

    return `${existingContent.slice(
      0,
      managedBlock.startOffset,
    )}${this.createManagedBlock(input.buildFingerprint)}${existingContent.slice(
      managedBlock.endOffset,
    )}`;
  }

  private scanManagedBlock(headersContent: string): ManagedBlockScanResult {
    const beginMarkerCount = this.countMarker(
      headersContent,
      OPENNAV_BLOCK_BEGIN_MARKER,
    );
    const endMarkerCount = this.countMarker(
      headersContent,
      OPENNAV_BLOCK_END_MARKER,
    );

    if (beginMarkerCount !== 1 || endMarkerCount !== 1) {
      return {
        beginMarkerCount,
        endMarkerCount,
      };
    }

    const startOffset = headersContent.indexOf(OPENNAV_BLOCK_BEGIN_MARKER);
    const endMarkerStartOffset = headersContent.indexOf(
      OPENNAV_BLOCK_END_MARKER,
    );
    const endOffset = this.findLineEndOffset(
      headersContent,
      endMarkerStartOffset + OPENNAV_BLOCK_END_MARKER.length,
    );

    if (endMarkerStartOffset < startOffset) {
      return {
        beginMarkerCount,
        endMarkerCount: 2,
      };
    }

    return {
      beginMarkerCount,
      blockContent: headersContent.slice(startOffset, endOffset),
      endMarkerCount,
      endOffset,
      startOffset,
    };
  }
}
