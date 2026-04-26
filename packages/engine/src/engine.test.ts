import { describe, expect, it } from "vitest";
import { Engine } from "./engine";
import * as publicExports from "./index";
import type { EngineExecuteInput } from "./types/engine-execute-input";

describe("Engine", () => {
  it("is exported from the public package entrypoint", () => {
    expect(publicExports.Engine).toEqual(Engine);
  });

  it("keeps Engine as the only runtime export", () => {
    expect(Object.keys(publicExports).sort()).toEqual(["Engine"]);
  });

  it("accepts site settings, an output directory, and built file paths", () => {
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory: "dist",
      filePaths: [
        "dist/index.html",
        "dist/docs/getting-started/index.html",
        "dist/robots.txt",
        "dist/sitemap.xml",
      ],
    };

    const result = Engine.execute(input, { dryRun: true });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "ENGINE_NOT_IMPLEMENTED",
        message: "Engine.execute has been defined but not implemented yet.",
        context: {
          siteName: "Example Docs",
          baseUrl: "https://example.com",
          outputDirectory: "dist",
          filePathCount: 4,
          dryRun: true,
        },
      });
    }
  });
});
