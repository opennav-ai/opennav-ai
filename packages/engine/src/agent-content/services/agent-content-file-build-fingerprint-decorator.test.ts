import { ok, type Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { AgentContentFileContent } from "../types/agent-content-file-content";
import { AgentContentFileBuildFingerprintDecorator } from "./agent-content-file-build-fingerprint-decorator";

describe("AgentContentFileBuildFingerprintDecorator", (): void => {
  it("appends exact bottom build fingerprint marker to lazy generated content", async (): Promise<void> => {
    const decorator = new AgentContentFileBuildFingerprintDecorator();
    const file = decorator.decorate({
      buildFingerprint: "sha256:build",
      file: {
        outputFilePath: "index.md",
        getContent: async (): Promise<
          Result<AgentContentFileContent, OpenNavError>
        > =>
          ok({
            content: "# Hello\n",
            warnings: [],
          }),
      },
    });

    const contentResult = await file.getContent();

    expect(contentResult.isOk()).toEqual(true);
    if (contentResult.isOk()) {
      expect(contentResult.value).toEqual({
        content:
          '# Hello\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json" -->\n',
        warnings: [],
      });
    }
  });
});
