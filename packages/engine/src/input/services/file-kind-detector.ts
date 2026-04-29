import { ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { EngineFileKind } from "../types/engine-file-kind";

/**
 * Detects how the engine should treat a built site file path.
 */
export class FileKindDetector {
  /**
   * Detects whether a built file path is HTML, Markdown, robots.txt, or unsupported.
   *
   * @param filePath - Built site file path passed into the engine.
   * @returns The detected file kind wrapped in a successful Result.
   */
  public detect(
    filePath: EngineFilePath,
  ): Result<EngineFileKind, OpenNavError> {
    const fileName = this.getFileName(filePath);

    if (fileName === "robots.txt") {
      return ok("robots");
    }

    if (this.isHttpErrorPageFileName(fileName)) {
      return ok("unsupported");
    }

    if (fileName.endsWith(".html")) {
      return ok("html");
    }

    if (fileName.endsWith(".md")) {
      return ok("markdown");
    }

    return ok("unsupported");
  }

  private getFileName(filePath: EngineFilePath): string {
    const normalizedFilePath = filePath.replaceAll("\\", "/");
    const fileNameStartIndex = normalizedFilePath.lastIndexOf("/") + 1;

    return normalizedFilePath.slice(fileNameStartIndex);
  }

  private isHttpErrorPageFileName(fileName: string): boolean {
    return /^[45]\d{2}\.html$/u.test(fileName);
  }
}
