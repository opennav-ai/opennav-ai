import { BuildFingerprintCommentBuilder } from "../../build-fingerprint/services/build-fingerprint-comment-builder";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { AccessGuidanceBuildResult } from "../types/access-guidance-build-result";
import type { AccessGuidanceFile } from "../types/access-guidance-file";
import type { RobotsTxtGuidanceBuildInput } from "../types/robots-txt-guidance-build-input";

const OPENNAV_BLOCK_BEGIN_MARKER = "# Begin OpenNav AI";
const OPENNAV_BLOCK_END_MARKER = "# End OpenNav AI";

interface ManagedBlockScanResult {
  readonly beginMarkerCount: number;
  readonly blockContent?: string | undefined;
  readonly endMarkerCount: number;
  readonly endOffset?: number | undefined;
  readonly startOffset?: number | undefined;
}

interface RobotsTxtGuidanceBuilderDependencies {
  readonly buildFingerprintCommentBuilder?: BuildFingerprintCommentBuilder;
}

/**
 * Plans `robots.txt` Content Signals guidance without writing files.
 */
export class RobotsTxtGuidanceBuilder {
  readonly #buildFingerprintCommentBuilder: BuildFingerprintCommentBuilder;

  /**
   * Creates a builder with default build fingerprint collaborators.
   *
   * @param dependencies - Optional collaborator overrides for focused tests.
   */
  public constructor(dependencies: RobotsTxtGuidanceBuilderDependencies = {}) {
    this.#buildFingerprintCommentBuilder =
      dependencies.buildFingerprintCommentBuilder ??
      new BuildFingerprintCommentBuilder();
  }

  /**
   * Creates or updates `robots.txt` content for a configured Content Signals directive.
   *
   * @param input - Existing robots content and optional serialized directive.
   * @returns Planned guidance files and non-fatal warnings.
   */
  public build(input: RobotsTxtGuidanceBuildInput): AccessGuidanceBuildResult {
    if (input.contentSignalLine === undefined) {
      return {
        files: [],
        warnings: [],
      };
    }

    if (input.robotsTxtFile === undefined) {
      return {
        files: [this.createRobotsTxtFile(input)],
        warnings: [],
      };
    }

    const managedBlock = this.scanManagedBlock(input.robotsTxtFile.content);

    if (!this.isManagedBlockValid(managedBlock)) {
      return {
        files: [],
        warnings: [
          this.createManagedBlockInvalidWarning(
            input.robotsTxtFile.filePath,
            managedBlock.beginMarkerCount,
            managedBlock.endMarkerCount,
          ),
        ],
      };
    }

    const contentOutsideManagedBlock = this.removeManagedBlock(
      input.robotsTxtFile.content,
      managedBlock,
    );
    const existingContentSignalLines = this.findContentSignalLines(
      contentOutsideManagedBlock,
    );

    if (existingContentSignalLines.length > 0) {
      return {
        files: [],
        warnings: [
          this.createContentSignalsConflictWarning(
            input.robotsTxtFile.filePath,
            input.contentSignalLine,
            existingContentSignalLines,
          ),
        ],
      };
    }

    if (managedBlock.blockContent !== undefined) {
      const content = this.replaceManagedBlock(input, managedBlock);

      if (content === input.robotsTxtFile.content) {
        return {
          files: [],
          warnings: [],
        };
      }

      return {
        files: [
          {
            outputFilePath: input.robotsTxtFile.filePath,
            content,
          },
        ],
        warnings: [],
      };
    }

    return {
      files: [
        {
          outputFilePath: input.robotsTxtFile.filePath,
          content: this.addContentSignalLine(
            input,
            input.robotsTxtFile.content,
          ),
        },
      ],
      warnings: [],
    };
  }

  private addContentSignalLine(
    input: RobotsTxtGuidanceBuildInput,
    robotsTxtContent: string,
  ): string {
    const wildcardUserAgentInsertionOffset =
      this.findWildcardUserAgentInsertionOffset(robotsTxtContent);

    if (wildcardUserAgentInsertionOffset === undefined) {
      return this.appendWildcardUserAgentGroup(robotsTxtContent, input);
    }

    const separatorBeforeSignal = this.needsLineBreakBeforeInsertion(
      robotsTxtContent,
      wildcardUserAgentInsertionOffset,
    )
      ? "\n"
      : "";

    return `${robotsTxtContent.slice(
      0,
      wildcardUserAgentInsertionOffset,
    )}${separatorBeforeSignal}${this.createManagedBlock(
      input.buildFingerprint,
      input.contentSignalLine ?? "",
      false,
    )}${robotsTxtContent.slice(wildcardUserAgentInsertionOffset)}`;
  }

  private appendWildcardUserAgentGroup(
    robotsTxtContent: string,
    input: RobotsTxtGuidanceBuildInput,
  ): string {
    const prefix = this.buildAppendPrefix(robotsTxtContent);

    return `${robotsTxtContent}${prefix}${this.createManagedBlock(
      input.buildFingerprint,
      input.contentSignalLine ?? "",
      true,
    )}`;
  }

  private buildAppendPrefix(robotsTxtContent: string): string {
    if (robotsTxtContent.length === 0) {
      return "";
    }

    if (robotsTxtContent.endsWith("\n")) {
      return "\n";
    }

    return "\n\n";
  }

  private createContentSignalsConflictWarning(
    filePath: string,
    configuredContentSignalLine: string,
    existingContentSignalLines: readonly string[],
  ): OpenNavError {
    return {
      code: "ACCESS_GUIDANCE_CONTENT_SIGNALS_CONFLICT",
      message:
        "Existing robots.txt Content Signals differ from the configured policy.",
      context: {
        filePath,
        configuredContentSignalLine,
        existingContentSignalLines,
      },
    };
  }

  private createManagedBlock(
    buildFingerprint: string,
    contentSignalLine: string,
    includeWildcardUserAgent: boolean,
  ): string {
    const ownedContent = includeWildcardUserAgent
      ? `User-agent: *\n${contentSignalLine}\n`
      : `${contentSignalLine}\n`;
    const marker = this.#buildFingerprintCommentBuilder.build({
      format: "line-comment",
      buildFingerprint,
    });

    return `${OPENNAV_BLOCK_BEGIN_MARKER}\n${marker.content}${ownedContent}${OPENNAV_BLOCK_END_MARKER}\n`;
  }

  private createManagedBlockInvalidWarning(
    filePath: string,
    beginMarkerCount: number,
    endMarkerCount: number,
  ): OpenNavError {
    return {
      code: "ACCESS_GUIDANCE_OPENNAV_MANAGED_BLOCK_INVALID",
      message: "Existing robots.txt contains an invalid OpenNav managed block.",
      context: {
        filePath,
        beginMarkerCount,
        endMarkerCount,
      },
    };
  }

  private createRobotsTxtFile(
    input: RobotsTxtGuidanceBuildInput,
  ): AccessGuidanceFile {
    return {
      outputFilePath: "robots.txt",
      content: this.createManagedBlock(
        input.buildFingerprint,
        input.contentSignalLine ?? "",
        true,
      ),
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

  private findContentSignalLines(robotsTxtContent: string): readonly string[] {
    return robotsTxtContent
      .split(/\r?\n/)
      .filter((line: string): boolean => /^\s*content-signal\s*:/i.test(line))
      .map((line: string): string => line.trim());
  }

  private findLineEndOffset(content: string, markerEndOffset: number): number {
    const nextNewlineOffset = content.indexOf("\n", markerEndOffset);

    if (nextNewlineOffset === -1) {
      return content.length;
    }

    return nextNewlineOffset + 1;
  }

  private findWildcardUserAgentInsertionOffset(
    robotsTxtContent: string,
  ): number | undefined {
    const wildcardUserAgentLine =
      /^[ \t]*user-agent[ \t]*:[ \t]*\*[ \t]*(?:\r?\n|$)/gim;
    const match = wildcardUserAgentLine.exec(robotsTxtContent);

    if (match === null) {
      return undefined;
    }

    return match.index + match[0].length;
  }

  private isManagedBlockValid(scanResult: ManagedBlockScanResult): boolean {
    return (
      scanResult.beginMarkerCount === scanResult.endMarkerCount &&
      scanResult.beginMarkerCount <= 1 &&
      scanResult.endMarkerCount <= 1
    );
  }

  private managedBlockIncludesWildcardUserAgent(blockContent: string): boolean {
    return /^[ \t]*user-agent[ \t]*:[ \t]*\*[ \t]*(?:\r?\n|$)/im.test(
      blockContent,
    );
  }

  private needsLineBreakBeforeInsertion(
    robotsTxtContent: string,
    insertionOffset: number,
  ): boolean {
    if (insertionOffset === 0) {
      return false;
    }

    return robotsTxtContent.at(insertionOffset - 1) !== "\n";
  }

  private removeManagedBlock(
    robotsTxtContent: string,
    managedBlock: ManagedBlockScanResult,
  ): string {
    if (
      managedBlock.startOffset === undefined ||
      managedBlock.endOffset === undefined
    ) {
      return robotsTxtContent;
    }

    return `${robotsTxtContent.slice(
      0,
      managedBlock.startOffset,
    )}${robotsTxtContent.slice(managedBlock.endOffset)}`;
  }

  private replaceManagedBlock(
    input: RobotsTxtGuidanceBuildInput,
    managedBlock: ManagedBlockScanResult,
  ): string {
    if (
      input.robotsTxtFile === undefined ||
      managedBlock.blockContent === undefined ||
      managedBlock.startOffset === undefined ||
      managedBlock.endOffset === undefined
    ) {
      return "";
    }

    const replacementBlock = this.createManagedBlock(
      input.buildFingerprint,
      input.contentSignalLine ?? "",
      this.managedBlockIncludesWildcardUserAgent(managedBlock.blockContent),
    );

    return `${input.robotsTxtFile.content.slice(
      0,
      managedBlock.startOffset,
    )}${replacementBlock}${input.robotsTxtFile.content.slice(
      managedBlock.endOffset,
    )}`;
  }

  private scanManagedBlock(robotsTxtContent: string): ManagedBlockScanResult {
    const beginMarkerCount = this.countMarker(
      robotsTxtContent,
      OPENNAV_BLOCK_BEGIN_MARKER,
    );
    const endMarkerCount = this.countMarker(
      robotsTxtContent,
      OPENNAV_BLOCK_END_MARKER,
    );

    if (beginMarkerCount !== 1 || endMarkerCount !== 1) {
      return {
        beginMarkerCount,
        endMarkerCount,
      };
    }

    const startOffset = robotsTxtContent.indexOf(OPENNAV_BLOCK_BEGIN_MARKER);
    const endMarkerStartOffset = robotsTxtContent.indexOf(
      OPENNAV_BLOCK_END_MARKER,
    );
    const endOffset = this.findLineEndOffset(
      robotsTxtContent,
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
      blockContent: robotsTxtContent.slice(startOffset, endOffset),
      endMarkerCount,
      endOffset,
      startOffset,
    };
  }
}
