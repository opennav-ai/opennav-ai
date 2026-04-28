import { describe, expect, it } from "vitest";
import { BuildFingerprintCommentBuilder } from "./build-fingerprint-comment-builder";

describe("BuildFingerprintCommentBuilder", (): void => {
  it("builds exact HTML comment build fingerprint markers for generated Markdown and text files", (): void => {
    const builder = new BuildFingerprintCommentBuilder();
    const result = builder.build({
      format: "html-comment",
      buildFingerprint: "sha256:build",
    });

    expect(result).toEqual({
      content:
        '<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json" -->\n',
    });
  });

  it("builds exact line-comment build fingerprint markers for robots.txt managed blocks", (): void => {
    const builder = new BuildFingerprintCommentBuilder();
    const result = builder.build({
      format: "line-comment",
      buildFingerprint: "sha256:build",
    });

    expect(result).toEqual({
      content:
        '# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json"\n',
    });
  });
});
