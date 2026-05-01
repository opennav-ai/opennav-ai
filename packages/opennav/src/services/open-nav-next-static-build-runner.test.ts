import { resolve } from "node:path";
import { ok, type Result } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenNavBuildResult, OpenNavError } from "../types/open-nav-build";
import type {
  OpenNavNextConfig,
  OpenNavNextOptions,
} from "../types/open-nav-next";
import type { OpenNavStaticSiteOptions } from "../types/open-nav-static-site";

type BuildMethod = () => Promise<Result<OpenNavBuildResult, OpenNavError>>;

type MockStaticSite = {
  readonly build: BuildMethod;
};

const mocks = vi.hoisted(
  (): {
    readonly build: ReturnType<typeof vi.fn<BuildMethod>>;
    readonly constructor: ReturnType<
      typeof vi.fn<(options: OpenNavStaticSiteOptions) => void>
    >;
  } => ({
    build: vi.fn<BuildMethod>(),
    constructor: vi.fn<(options: OpenNavStaticSiteOptions) => void>(),
  }),
);

vi.mock("../index", (): { readonly OpenNavStaticSite: unknown } => ({
  OpenNavStaticSite: vi.fn(function MockOpenNavStaticSite(
    this: unknown,
    options: OpenNavStaticSiteOptions,
  ): MockStaticSite {
    mocks.constructor(options);

    return {
      build: mocks.build,
    };
  }),
}));

import { OpenNavNextStaticBuildRunner } from "./open-nav-next-static-build-runner";

describe("OpenNavNextStaticBuildRunner", (): void => {
  beforeEach((): void => {
    mocks.build.mockReset();
    mocks.constructor.mockReset();
    mocks.build.mockResolvedValue(
      ok({
        createdFilePaths: ["llms.txt"],
        modifiedFilePaths: ["index.html"],
        skippedFilePaths: [],
        warnings: [],
      }),
    );
  });

  it("uses the explicit OpenNav output directory before the Next config directory", async (): Promise<void> => {
    const result = await runNextStaticBuild(
      {
        siteName: "Example Docs",
        siteUrl: "https://example.com",
        mode: "static",
        outputDirectory: "public-build/",
      },
      {
        output: "export",
        distDir: "dist",
      },
    );

    expect(result.isOk()).toEqual(true);
    expect(mocks.constructor.mock.calls).toEqual([
      [
        {
          siteName: "Example Docs",
          siteUrl: "https://example.com",
          outputDirectory: resolve("public-build"),
          preset: "next-export",
          accessGuidance: undefined,
        },
      ],
    ]);
    expect(mocks.build.mock.calls).toEqual([[]]);
  });

  it("uses the Next config directory when no explicit OpenNav output directory is provided", async (): Promise<void> => {
    const result = await runNextStaticBuild(
      {
        siteName: "Example Docs",
        siteUrl: "https://example.com",
        mode: "static",
      },
      {
        output: "export",
        distDir: "dist/",
      },
    );

    expect(result.isOk()).toEqual(true);
    expect(mocks.constructor.mock.calls).toEqual([
      [
        {
          siteName: "Example Docs",
          siteUrl: "https://example.com",
          outputDirectory: resolve("dist"),
          preset: "next-export",
          accessGuidance: undefined,
        },
      ],
    ]);
    expect(mocks.build.mock.calls).toEqual([[]]);
  });

  it("falls back to the Next static export default when no output directory is configured", async (): Promise<void> => {
    const result = await runNextStaticBuild(
      {
        siteName: "Example Docs",
        siteUrl: "https://example.com",
        mode: "static",
      },
      {
        output: "export",
      },
    );

    expect(result.isOk()).toEqual(true);
    expect(mocks.constructor.mock.calls).toEqual([
      [
        {
          siteName: "Example Docs",
          siteUrl: "https://example.com",
          outputDirectory: resolve("out"),
          preset: "next-export",
          accessGuidance: undefined,
        },
      ],
    ]);
    expect(mocks.build.mock.calls).toEqual([[]]);
  });

  it("rejects an absolute explicit OpenNav output directory", (): void => {
    const outputDirectory = resolve("public-build");
    const runner = new OpenNavNextStaticBuildRunner({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
      mode: "static",
      outputDirectory,
    });
    const result = runner.register({
      output: "export",
      distDir: "dist",
    });

    expect(result.isErr()).toEqual(true);

    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "OPENNAV_NEXT_RELATIVE_OUTPUT_DIRECTORY_REQUIRED",
        message: "OpenNav Next output directories must be relative paths.",
        context: {
          source: "outputDirectory",
          outputDirectory,
        },
      });
    }

    expect(mocks.constructor.mock.calls).toEqual([]);
    expect(mocks.build.mock.calls).toEqual([]);
  });

  it("rejects an absolute Next config directory when OpenNav would read from it", (): void => {
    const outputDirectory = resolve("dist");
    const runner = new OpenNavNextStaticBuildRunner({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
      mode: "static",
    });
    const result = runner.register({
      output: "export",
      distDir: outputDirectory,
    });

    expect(result.isErr()).toEqual(true);

    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "OPENNAV_NEXT_RELATIVE_OUTPUT_DIRECTORY_REQUIRED",
        message: "OpenNav Next output directories must be relative paths.",
        context: {
          source: "distDir",
          outputDirectory,
        },
      });
    }

    expect(mocks.constructor.mock.calls).toEqual([]);
    expect(mocks.build.mock.calls).toEqual([]);
  });
});

async function runNextStaticBuild(
  options: OpenNavNextOptions,
  nextConfig: OpenNavNextConfig,
): Promise<Result<OpenNavBuildResult, OpenNavError>> {
  const runner = new OpenNavNextStaticBuildRunner(options);
  const registerResult = runner.register(nextConfig);

  expect(registerResult.isOk()).toEqual(true);

  return await runner.build();
}
