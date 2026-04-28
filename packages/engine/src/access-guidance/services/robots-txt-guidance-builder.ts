import type { OpenNavError } from "../../common/types/opennav-error";
import type { AccessGuidanceBuildResult } from "../types/access-guidance-build-result";
import type { AccessGuidanceFile } from "../types/access-guidance-file";
import type { RobotsTxtGuidanceBuildInput } from "../types/robots-txt-guidance-build-input";

/**
 * Plans `robots.txt` Content Signals guidance without writing files.
 */
export class RobotsTxtGuidanceBuilder {
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
        files: [
          this.createRobotsTxtFile("robots.txt", input.contentSignalLine),
        ],
        warnings: [],
      };
    }

    const existingContentSignalLines = this.findContentSignalLines(
      input.robotsTxtFile.content,
    );

    if (existingContentSignalLines.length > 0) {
      if (
        existingContentSignalLines.every(
          (line: string): boolean =>
            this.normalizeContentSignalLine(line) ===
            this.normalizeContentSignalLine(input.contentSignalLine ?? ""),
        )
      ) {
        return {
          files: [],
          warnings: [],
        };
      }

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

    return {
      files: [
        {
          outputFilePath: input.robotsTxtFile.filePath,
          content: this.addContentSignalLine(
            input.robotsTxtFile.content,
            input.contentSignalLine,
          ),
        },
      ],
      warnings: [],
    };
  }

  private addContentSignalLine(
    robotsTxtContent: string,
    contentSignalLine: string,
  ): string {
    const wildcardUserAgentInsertionOffset =
      this.findWildcardUserAgentInsertionOffset(robotsTxtContent);

    if (wildcardUserAgentInsertionOffset === undefined) {
      return this.appendWildcardUserAgentGroup(
        robotsTxtContent,
        contentSignalLine,
      );
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
    )}${separatorBeforeSignal}${contentSignalLine}\n${robotsTxtContent.slice(
      wildcardUserAgentInsertionOffset,
    )}`;
  }

  private appendWildcardUserAgentGroup(
    robotsTxtContent: string,
    contentSignalLine: string,
  ): string {
    const prefix = this.buildAppendPrefix(robotsTxtContent);

    return `${robotsTxtContent}${prefix}User-agent: *\n${contentSignalLine}\n`;
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

  private createRobotsTxtFile(
    outputFilePath: string,
    contentSignalLine: string,
  ): AccessGuidanceFile {
    return {
      outputFilePath,
      content: `User-agent: *\n${contentSignalLine}\n`,
    };
  }

  private findContentSignalLines(robotsTxtContent: string): readonly string[] {
    return robotsTxtContent
      .split(/\r?\n/)
      .filter((line: string): boolean => /^\s*content-signal\s*:/i.test(line))
      .map((line: string): string => line.trim());
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

  private needsLineBreakBeforeInsertion(
    robotsTxtContent: string,
    insertionOffset: number,
  ): boolean {
    if (insertionOffset === 0) {
      return false;
    }

    return robotsTxtContent.at(insertionOffset - 1) !== "\n";
  }

  private normalizeContentSignalLine(contentSignalLine: string): string {
    return contentSignalLine
      .trim()
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }
}
