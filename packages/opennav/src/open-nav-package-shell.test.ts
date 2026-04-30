import { describe, expect, it } from "vitest";
import { OpenNavAstro } from "./astro";
import { OpenNavConfig, OpenNavStaticSite } from "./index";
import { OpenNavNext } from "./next";
import type { OpenNavAstroIntegration } from "./types/open-nav-astro";
import type { OpenNavNextConfig } from "./types/open-nav-next";

describe("OpenNav public package shell", (): void => {
  it("exports the root static-site SDK and config helper", (): void => {
    const config = OpenNavConfig({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
    });
    const staticSite = new OpenNavStaticSite({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
      outputDirectory: "dist",
    });

    expect(config).toEqual({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
    });
    expect(staticSite).toBeInstanceOf(OpenNavStaticSite);
  });

  it("exports an Astro-compatible integration with static build hooks", (): void => {
    const integration: OpenNavAstroIntegration = OpenNavAstro({
      siteName: "Example Docs",
      mode: "static",
    });

    expect({
      name: integration.name,
      hooks: {
        configDone: typeof integration.hooks["astro:config:done"],
        buildDone: typeof integration.hooks["astro:build:done"],
      },
    }).toEqual({
      name: "@opennav-ai/opennav/astro",
      hooks: {
        configDone: "function",
        buildDone: "function",
      },
    });
  });

  it("exports a Next config wrapper that preserves user config fields", (): void => {
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

  it("defaults the Next config wrapper to static mode", (): void => {
    const nextConfig: OpenNavNextConfig = {
      output: "export",
      reactStrictMode: true,
    };
    const wrappedConfig = OpenNavNext({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
    })(nextConfig);

    expect(wrappedConfig).toEqual({
      output: "export",
      reactStrictMode: true,
    });
  });

  it("rejects Next configs without static export output", (): void => {
    const nextConfig: OpenNavNextConfig = {
      output: "standalone",
    };

    expect((): void => {
      OpenNavNext({
        siteName: "Example Docs",
        siteUrl: "https://example.com",
        mode: "static",
      })(nextConfig);
    }).toThrow(
      'OPENNAV_NEXT_STATIC_EXPORT_REQUIRED: OpenNav Next static mode requires `output: "export"`.',
    );
  });
});
