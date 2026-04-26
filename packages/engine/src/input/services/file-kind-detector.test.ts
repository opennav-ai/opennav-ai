import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { EngineFileKind } from "../types/engine-file-kind";
import { FileKindDetector } from "./file-kind-detector";

describe("FileKindDetector", (): void => {
  it("detects supported built site file kinds from their paths", (): void => {
    const detector = new FileKindDetector();
    const filePaths: readonly EngineFilePath[] = [
      "index.html",
      "docs/api.md",
      "robots.txt",
      "sitemap.xml",
      "image.png",
    ];

    const results = filePaths.map(
      (filePath: EngineFilePath): Result<EngineFileKind, OpenNavError> =>
        detector.detect(filePath),
    );
    const detectedKinds = results.map(
      (result: Result<EngineFileKind, OpenNavError>): EngineFileKind =>
        result._unsafeUnwrap(),
    );

    expect(detectedKinds).toEqual([
      "html",
      "markdown",
      "robots",
      "sitemap",
      "unsupported",
    ]);
  });
});
