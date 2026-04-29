import type { EngineExecuteResult, OpenNavError } from "@opennav-ai/engine";
import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { OpenNavAstro } from "./astro";
import { OpenNavConfig, OpenNavStaticSite } from "./index";
import { OpenNavNext } from "./next";
import type { OpenNavAstroIntegration } from "./types/open-nav-astro-integration";
import type { OpenNavNextConfig } from "./types/open-nav-next-config";

describe("OpenNav public package shell", (): void => {
  it("exports the root static-site SDK and config helper", async (): Promise<void> => {
    const config = OpenNavConfig({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
    });
    const staticSite = new OpenNavStaticSite({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
      outputDirectory: "dist",
    });

    const result: Result<EngineExecuteResult, OpenNavError> =
      await staticSite.build({ dryRun: true });

    expect(config).toEqual({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
    });
    expect(result.isErr()).toEqual(true);

    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "OPENNAV_STATIC_SITE_NOT_IMPLEMENTED",
        message:
          "OpenNavStaticSite.build is stubbed until static directory scanning is implemented.",
        context: {
          dryRun: true,
          outputDirectory: "dist",
        },
      });
    }
  });

  it("exports an Astro-compatible integration-shaped stub", (): void => {
    const integration: OpenNavAstroIntegration = OpenNavAstro({
      siteName: "Example Docs",
      mode: "static",
    });

    expect(integration).toEqual({
      name: "@opennav-ai/opennav/astro",
      hooks: {},
    });
  });

  it("exports a Next config wrapper-shaped stub", (): void => {
    const nextConfig: OpenNavNextConfig = {
      output: "export",
      reactStrictMode: true,
    };
    const wrappedConfig = OpenNavNext({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
      mode: "static",
    })(nextConfig);

    expect(wrappedConfig).toEqual({
      output: "export",
      reactStrictMode: true,
    });
  });
});
