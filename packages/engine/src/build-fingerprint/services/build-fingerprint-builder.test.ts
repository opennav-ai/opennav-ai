import { describe, expect, it } from "vitest";
import { BuildFingerprintBuilder } from "./build-fingerprint-builder";

describe("BuildFingerprintBuilder", (): void => {
  it("builds exact deterministic content fingerprints", (): void => {
    const builder = new BuildFingerprintBuilder();

    expect(builder.buildContentFingerprint("# Hello\n")).toEqual(
      "sha256:90f8ec5669cd34183b9b0fdf8b94f5efb4c3672876330f4aa76088c2b4ad17be",
    );
  });

  it("builds exact deterministic build fingerprints from normalized inputs", (): void => {
    const builder = new BuildFingerprintBuilder();
    const firstFingerprint = builder.buildBuildFingerprint({
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      sourceFiles: [
        {
          filePath: "robots.txt",
          contentFingerprint: "sha256:bbb",
        },
        {
          filePath: "index.html",
          contentFingerprint: "sha256:aaa",
        },
      ],
      contentSignals: ["Content-signal: search=yes, ai-input=yes, ai-train=no"],
    });
    const secondFingerprint = builder.buildBuildFingerprint({
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      sourceFiles: [
        {
          filePath: "index.html",
          contentFingerprint: "sha256:aaa",
        },
        {
          filePath: "robots.txt",
          contentFingerprint: "sha256:bbb",
        },
      ],
      contentSignals: ["Content-signal: search=yes, ai-input=yes, ai-train=no"],
    });

    expect({
      firstFingerprint,
      secondFingerprint,
    }).toEqual({
      firstFingerprint:
        "sha256:0726ee08a3c2b354e09ea04c16700ff461fb69508c21684895f187feb71be5ef",
      secondFingerprint:
        "sha256:0726ee08a3c2b354e09ea04c16700ff461fb69508c21684895f187feb71be5ef",
    });
  });

  it("changes build fingerprints when source content fingerprints change", (): void => {
    const builder = new BuildFingerprintBuilder();
    const firstFingerprint = builder.buildBuildFingerprint({
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      sourceFiles: [
        {
          filePath: "index.html",
          contentFingerprint: "sha256:aaa",
        },
      ],
    });
    const secondFingerprint = builder.buildBuildFingerprint({
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      sourceFiles: [
        {
          filePath: "index.html",
          contentFingerprint: "sha256:changed",
        },
      ],
    });

    expect({
      firstFingerprint,
      secondFingerprint,
    }).toEqual({
      firstFingerprint:
        "sha256:5bcf1847872fdf241b5734a8969e6b0f7d8d5479f0e4e61c9e2c28e64098b42d",
      secondFingerprint:
        "sha256:c47ab7c483727c1872814480d4badae666361bc6d33a810f50d45956e6d5e041",
    });
  });
});
