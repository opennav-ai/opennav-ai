import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { OpenNavAstro } from "./astro";
import type { OpenNavAstroIntegration } from "./types/open-nav-astro";

interface TestAstroConfigDoneHookInput {
  readonly config: {
    readonly site?: string | undefined;
  };
  readonly logger: TestAstroLogger;
}

interface TestAstroBuildDoneHookInput {
  readonly assets: ReadonlyMap<string, readonly URL[]>;
  readonly dir: URL;
  readonly logger: TestAstroLogger;
  readonly pages: readonly {
    readonly pathname: string;
  }[];
}

interface TestAstroLogger {
  readonly error: (message: string) => void;
  readonly info: (message: string) => void;
  readonly warn: (message: string) => void;
}

type TestAstroHook<Input> = (input: Input) => Promise<void> | void;

describe("OpenNavAstro", (): void => {
  let fixtureDirectory: string | undefined;
  const buildFingerprint = "sha256:0328bd23bfdb";

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  async function createAstroOutputDirectory(): Promise<string> {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-astro-"));
    const outputDirectory = join(fixtureDirectory, "dist");

    await writeOutputFile(
      outputDirectory,
      "index.html",
      '<!doctype html><html lang="en"><head><title>Home</title><meta name="description" content="Start here."></head><body><main><h1>Home</h1><p>Start here.</p></main></body></html>',
    );
    await writeOutputFile(
      outputDirectory,
      "docs/about.html",
      '<!doctype html><html lang="en"><head><title>About</title><meta name="description" content="Learn about OpenNav."></head><body><main><h1>About</h1><p>Learn about OpenNav.</p></main></body></html>',
    );
    await writeOutputFile(outputDirectory, "assets/logo.svg", "<svg></svg>");

    return outputDirectory;
  }

  function createTestAstroLogger(warnings: string[] = []): TestAstroLogger {
    return {
      error: (_message: string): void => undefined,
      info: (_message: string): void => undefined,
      warn: (message: string): void => {
        warnings.push(message);
      },
    };
  }

  function getAstroHook<Input>(
    integration: OpenNavAstroIntegration,
    hookName: string,
  ): TestAstroHook<Input> {
    const hook = integration.hooks[hookName];

    expect(typeof hook).toEqual("function");

    if (typeof hook !== "function") {
      throw new Error(`Expected ${hookName} to be installed.`);
    }

    return hook as TestAstroHook<Input>;
  }

  async function writeOutputFile(
    outputDirectory: string,
    outputFilePath: string,
    content: string,
  ): Promise<void> {
    const absoluteFilePath = join(outputDirectory, outputFilePath);

    await mkdir(dirname(absoluteFilePath), { recursive: true });
    await writeFile(absoluteFilePath, content, "utf8");
  }

  it("runs the static engine after Astro emits a static output directory", async (): Promise<void> => {
    const outputDirectory = await createAstroOutputDirectory();
    const integration = OpenNavAstro({
      siteName: "Example Docs",
      mode: "static",
    });
    const configDoneHook = getAstroHook<TestAstroConfigDoneHookInput>(
      integration,
      "astro:config:done",
    );
    const buildDoneHook = getAstroHook<TestAstroBuildDoneHookInput>(
      integration,
      "astro:build:done",
    );
    const warnings: string[] = [];

    await configDoneHook({
      config: {
        site: "https://example.com",
      },
      logger: createTestAstroLogger(),
    });
    await buildDoneHook({
      assets: new Map<string, readonly URL[]>(),
      dir: pathToFileURL(outputDirectory),
      logger: createTestAstroLogger(warnings),
      pages: [],
    });

    expect({
      llmsTxt: await readFile(join(outputDirectory, "llms.txt"), "utf8"),
      indexMarkdown: await readFile(join(outputDirectory, "index.md"), "utf8"),
      aboutMarkdown: await readFile(
        join(outputDirectory, "docs/about.md"),
        "utf8",
      ),
      manifest: await readFile(
        join(outputDirectory, ".well-known/opennav.json"),
        "utf8",
      ),
      warnings,
    }).toEqual({
      llmsTxt: `# Example Docs\n\n## Root\n\n- [Home](https://example.com/index.md): Start here.\n\n## Docs\n\n- [About](https://example.com/docs/about.md): Learn about OpenNav.\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json" -->\n`,
      indexMarkdown: `# Home\n\nStart here.\n\n---\n\nSite index: [llms.txt](https://example.com/llms.txt)\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json" -->\n`,
      aboutMarkdown: `# About\n\nLearn about OpenNav.\n\n---\n\nSite index: [llms.txt](https://example.com/llms.txt)\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json" -->\n`,
      manifest: `{\n  "opennav": true,\n  "version": "1.0",\n  "profile": "static-agent-ready",\n  "site": "https://example.com",\n  "build_fingerprint": "${buildFingerprint}",\n  "spec": "https://opennav.ai/spec/1.0",\n  "artifacts": {\n    "llms_txt": "/llms.txt",\n    "llms_full_txt": "/llms-full.txt",\n    "well_known_llms_txt": "/.well-known/llms.txt",\n    "well_known_llms_full_txt": "/.well-known/llms-full.txt"\n  },\n  "capabilities": {\n    "clean_markdown": true,\n    "llms_txt": true,\n    "llms_full_txt": true,\n    "html_resource_links": true,\n    "content_signals": false\n  }\n}\n`,
      warnings: [],
    });
  });

  it("writes Cloudflare Pages headers by default when Astro platform is configured", async (): Promise<void> => {
    const outputDirectory = await createAstroOutputDirectory();
    const integration = OpenNavAstro({
      siteName: "Example Docs",
      mode: "static",
      platform: "cloudflare-pages",
    });
    const configDoneHook = getAstroHook<TestAstroConfigDoneHookInput>(
      integration,
      "astro:config:done",
    );
    const buildDoneHook = getAstroHook<TestAstroBuildDoneHookInput>(
      integration,
      "astro:build:done",
    );

    await configDoneHook({
      config: {
        site: "https://example.com",
      },
      logger: createTestAstroLogger(),
    });
    await buildDoneHook({
      assets: new Map<string, readonly URL[]>(),
      dir: pathToFileURL(outputDirectory),
      logger: createTestAstroLogger(),
      pages: [],
    });

    expect(await readFile(join(outputDirectory, "_headers"), "utf8")).toEqual(
      `# Begin OpenNav AI
# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json"
/*.md
  Content-Type: text/markdown; charset=utf-8
  X-Content-Type-Options: nosniff

/llms.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/llms.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/opennav.json
  Content-Type: application/json; charset=utf-8
  X-Content-Type-Options: nosniff

/
  Link: <https://example.com/index.md>; rel="alternate"; type="text/markdown"
  Link: <https://example.com/llms.txt>; rel="index"; type="text/plain"

/docs/about
  Link: <https://example.com/docs/about.md>; rel="alternate"; type="text/markdown"
  Link: <https://example.com/llms.txt>; rel="index"; type="text/plain"
# End OpenNav AI
`,
    );
  });
});
