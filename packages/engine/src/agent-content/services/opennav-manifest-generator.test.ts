import { describe, expect, it } from "vitest";
import { OpenNavManifestGenerator } from "./opennav-manifest-generator";

describe("OpenNavManifestGenerator", (): void => {
  it("generates exact static compatibility manifest content", (): void => {
    const generator = new OpenNavManifestGenerator();
    const result = generator.generate({
      baseUrl: "https://example.com",
      buildFingerprint: "sha256:build",
      contentSignals: true,
      htmlResourceLinks: true,
    });

    expect(result).toEqual({
      outputFilePath: ".well-known/opennav.json",
      content:
        '{\n  "opennav": true,\n  "version": "1.0",\n  "profile": "static-agent-ready",\n  "site": "https://example.com",\n  "build_fingerprint": "sha256:build",\n  "spec": "https://opennav.ai/spec/1.0",\n  "artifacts": {\n    "llms_txt": "/llms.txt",\n    "llms_full_txt": "/llms-full.txt",\n    "well_known_llms_txt": "/.well-known/llms.txt",\n    "well_known_llms_full_txt": "/.well-known/llms-full.txt"\n  },\n  "capabilities": {\n    "clean_markdown": true,\n    "llms_txt": true,\n    "llms_full_txt": true,\n    "html_resource_links": true,\n    "content_signals": true\n  }\n}\n',
    });
  });
});
