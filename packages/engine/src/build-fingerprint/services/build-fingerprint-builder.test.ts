import { describe, expect, it } from "vitest";
import { BuildFingerprintBuilder } from "./build-fingerprint-builder";

describe("BuildFingerprintBuilder", (): void => {
  it("builds exact deterministic content fingerprints", (): void => {
    const builder = new BuildFingerprintBuilder();

    expect(builder.buildContentFingerprint("# Hello\n")).toEqual(
      "sha256:90f8ec5669cd34183b9b0fdf8b94f5efb4c3672876330f4aa76088c2b4ad17be",
    );
  });

  it("builds exact normalized HTML source fingerprints without managed resource links", (): void => {
    const builder = new BuildFingerprintBuilder();

    expect(
      builder.buildContentFingerprint({
        sourceContentKind: "html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <link rel="alternate" type="text/markdown" href="https://example.com/index.md" data-opennav="resource-link" data-opennav-sha="sha256:stale">
    <link rel="index" type="text/plain" href="https://example.com/llms.txt" data-opennav-sha="sha256:stale">

    <link rel="stylesheet" href="/site.css">
    <title>Home</title>
  </head>
  <body>
    <h1>Home</h1>
  </body>
</html>
`,
      }),
    ).toEqual(
      "sha256:7071ed4dc779b5d89a9f3262545c2fd3c3216124e20693147338a3ceaff092f5",
    );
  });

  it("builds exact normalized robots source fingerprints without managed Content Signals blocks", (): void => {
    const builder = new BuildFingerprintBuilder();

    expect(
      builder.buildContentFingerprint({
        sourceContentKind: "robots",
        content: `User-agent: *
# Begin OpenNav AI
# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:stale" manifest="/.well-known/opennav.json"
Content-signal: search=yes
# End OpenNav AI
Allow: /
`,
      }),
    ).toEqual(
      "sha256:16ceb5ee3e0dc13aa9adf31a3ebbe45a1d965b8c2b9f72eaf84e5911e140ed95",
    );
  });

  it("builds exact short fingerprints for product-visible run markers", (): void => {
    const builder = new BuildFingerprintBuilder();

    expect(
      builder.buildShortFingerprint(
        "sha256:90f8ec5669cd34183b9b0fdf8b94f5efb4c3672876330f4aa76088c2b4ad17be",
      ),
    ).toEqual("sha256:90f8ec5669cd");
  });

  it("builds exact short deterministic build fingerprints from normalized inputs", (): void => {
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
      firstFingerprint: "sha256:0726ee08a3c2",
      secondFingerprint: "sha256:0726ee08a3c2",
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
      firstFingerprint: "sha256:5bcf1847872f",
      secondFingerprint: "sha256:c47ab7c48372",
    });
  });
});
