import { ok, type Result } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenNavBuildResult, OpenNavError } from "./types/open-nav-build";
import type {
  OpenNavStaticSiteBuildOptions,
  OpenNavStaticSiteOptions,
} from "./types/open-nav-static-site";

type BuildMethod = (
  options: OpenNavStaticSiteBuildOptions,
) => Promise<Result<OpenNavBuildResult, OpenNavError>>;

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

vi.mock("./index", (): { readonly OpenNavStaticSite: unknown } => ({
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

import { runOpenNavCli } from "./cli-commander";

describe("runOpenNavCli", (): void => {
  beforeEach((): void => {
    mocks.build.mockReset();
    mocks.constructor.mockReset();
  });

  it("runs the static build command through OpenNavStaticSite", async (): Promise<void> => {
    const output: string[] = [];
    const logSpy = vi
      .spyOn(console, "log")
      .mockImplementation((message?: unknown): void => {
        output.push(String(message));
      });

    mocks.build.mockResolvedValue(
      ok({
        createdFilePaths: ["llms.txt", ".well-known/opennav.json"],
        modifiedFilePaths: ["index.html"],
        skippedFilePaths: ["assets/logo.svg"],
        warnings: [
          {
            code: "ENGINE_FILE_UNSUPPORTED",
            message: "The engine skipped an unsupported built site file.",
            context: {
              filePath: "assets/logo.svg",
              kind: "unsupported",
            },
          },
        ],
      }),
    );

    try {
      const result = await runOpenNavCli([
        "node",
        "opennav",
        "build",
        "--static",
        "--output",
        "dist",
        "--site-url",
        "https://example.com",
        "--site-name",
        "Example Docs",
        "--preset",
        "astro",
        "--dry-run",
      ]);

      expect(result.isOk()).toEqual(true);
      expect(mocks.constructor.mock.calls).toEqual([
        [
          {
            siteName: "Example Docs",
            siteUrl: "https://example.com",
            outputDirectory: "dist",
            preset: "astro",
          },
        ],
      ]);
      expect(mocks.build.mock.calls).toEqual([[{ dryRun: true }]]);
      expect(output).toEqual([
        [
          "OpenNav build completed (dry-run).",
          "Created: 2",
          "Modified: 1",
          "Skipped: 1",
          "Warnings: 1",
        ].join("\n"),
      ]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("defaults to writing files when dry-run is omitted", async (): Promise<void> => {
    const output: string[] = [];
    const logSpy = vi
      .spyOn(console, "log")
      .mockImplementation((message?: unknown): void => {
        output.push(String(message));
      });

    mocks.build.mockResolvedValue(
      ok({
        createdFilePaths: ["llms.txt"],
        modifiedFilePaths: ["index.html"],
        skippedFilePaths: [],
        warnings: [],
      }),
    );

    try {
      const result = await runOpenNavCli([
        "node",
        "opennav",
        "build",
        "--static",
        "--output",
        "dist",
        "--site-url",
        "https://example.com",
        "--site-name",
        "Example Docs",
      ]);

      expect(result.isOk()).toEqual(true);
      expect(mocks.constructor.mock.calls).toEqual([
        [
          {
            siteName: "Example Docs",
            siteUrl: "https://example.com",
            outputDirectory: "dist",
            preset: undefined,
          },
        ],
      ]);
      expect(mocks.build.mock.calls).toEqual([[{ dryRun: false }]]);
      expect(output).toEqual([
        [
          "OpenNav build completed.",
          "Created: 1",
          "Modified: 1",
          "Skipped: 0",
          "Warnings: 0",
        ].join("\n"),
      ]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("passes platform and static header settings to OpenNavStaticSite", async (): Promise<void> => {
    const output: string[] = [];
    const logSpy = vi
      .spyOn(console, "log")
      .mockImplementation((message?: unknown): void => {
        output.push(String(message));
      });

    mocks.build.mockResolvedValue(
      ok({
        createdFilePaths: ["llms.txt", "_headers"],
        modifiedFilePaths: ["index.html"],
        skippedFilePaths: [],
        warnings: [],
      }),
    );

    try {
      const result = await runOpenNavCli([
        "node",
        "opennav",
        "build",
        "--static",
        "--output",
        "dist",
        "--site-url",
        "https://example.com",
        "--site-name",
        "Example Docs",
        "--platform",
        "cloudflare-pages",
        "--static-headers",
      ]);

      expect(result.isOk()).toEqual(true);
      expect(mocks.constructor.mock.calls).toEqual([
        [
          {
            siteName: "Example Docs",
            siteUrl: "https://example.com",
            outputDirectory: "dist",
            preset: undefined,
            platform: "cloudflare-pages",
            staticHeaders: {
              enabled: true,
            },
          },
        ],
      ]);
      expect(mocks.build.mock.calls).toEqual([[{ dryRun: false }]]);
      expect(output).toEqual([
        [
          "OpenNav build completed.",
          "Created: 2",
          "Modified: 1",
          "Skipped: 0",
          "Warnings: 0",
        ].join("\n"),
      ]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("passes platform without static headers so the SDK can use platform defaults", async (): Promise<void> => {
    const output: string[] = [];
    const logSpy = vi
      .spyOn(console, "log")
      .mockImplementation((message?: unknown): void => {
        output.push(String(message));
      });

    mocks.build.mockResolvedValue(
      ok({
        createdFilePaths: ["llms.txt", "_headers"],
        modifiedFilePaths: ["index.html"],
        skippedFilePaths: [],
        warnings: [],
      }),
    );

    try {
      const result = await runOpenNavCli([
        "node",
        "opennav",
        "build",
        "--static",
        "--output",
        "dist",
        "--site-url",
        "https://example.com",
        "--site-name",
        "Example Docs",
        "--platform",
        "cloudflare-pages",
      ]);

      expect(result.isOk()).toEqual(true);
      expect(mocks.constructor.mock.calls).toEqual([
        [
          {
            siteName: "Example Docs",
            siteUrl: "https://example.com",
            outputDirectory: "dist",
            preset: undefined,
            platform: "cloudflare-pages",
          },
        ],
      ]);
      expect(mocks.build.mock.calls).toEqual([[{ dryRun: false }]]);
      expect(output).toEqual([
        [
          "OpenNav build completed.",
          "Created: 2",
          "Modified: 1",
          "Skipped: 0",
          "Warnings: 0",
        ].join("\n"),
      ]);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("rejects static headers without a platform", async (): Promise<void> => {
    const result = await runOpenNavCli([
      "node",
      "opennav",
      "build",
      "--static",
      "--output",
      "dist",
      "--site-url",
      "https://example.com",
      "--site-name",
      "Example Docs",
      "--static-headers",
    ]);

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "OPENNAV_CLI_COMMAND_FAILED",
        message: "error: --platform is required when --static-headers is used",
        context: {
          commanderCode: "commander.error",
        },
      });
    }
    expect(mocks.constructor.mock.calls).toEqual([]);
    expect(mocks.build.mock.calls).toEqual([]);
  });

  it("rejects unsupported platforms", async (): Promise<void> => {
    const result = await runOpenNavCli([
      "node",
      "opennav",
      "build",
      "--static",
      "--output",
      "dist",
      "--site-url",
      "https://example.com",
      "--site-name",
      "Example Docs",
      "--platform",
      "somewhere-else",
    ]);

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "OPENNAV_CLI_COMMAND_FAILED",
        message:
          'error: Unsupported platform "somewhere-else". Supported platforms: cloudflare-pages. Pass a supported platform with --platform, or omit --platform when you do not need platform-specific artifacts.',
        context: {
          commanderCode: "commander.error",
        },
      });
    }
    expect(mocks.constructor.mock.calls).toEqual([]);
    expect(mocks.build.mock.calls).toEqual([]);
  });
});
