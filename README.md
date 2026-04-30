# ![OpenNav AI](./assets/full-open-logo.svg)


## **The open standard for agent navigation**

Search finds pages. OpenNav makes them usable.

OpenNav is the navigation layer for the agentic web: open-source
infrastructure that helps websites expose clean, predictable, agent-readable
paths through their content. The web was built for people looking at pages.
Agents need something different: stable discovery files, readable content,
machine-checkable compatibility metadata, and explicit access guidance.

Our first launch milestone is intentionally simple. Point OpenNav at a built
static site folder such as `dist/`, `out/`, `build/`, or your own build output
path. OpenNav reads the HTML, Markdown, and `robots.txt` files in that folder,
then adds the static files and page links agents need:

```txt
dist/
  llms.txt
  llms-full.txt
  .well-known/llms.txt
  .well-known/llms-full.txt
  .well-known/opennav.json
  index.md
  docs/getting-started/index.md
  docs/api/index.md
  index.html                         # includes agent-readable resource links
  docs/getting-started/index.html    # includes agent-readable resource links
  docs/api/index.html                # includes agent-readable resource links
  robots.txt                         # includes configured Content Signals guidance
```

Launch Day 1 does not currently include server-side Markdown responses or HTTP
content negotiation. Those belong to the next layer: runtime integrations that
can serve Markdown dynamically, negotiate content, and extend coverage across
major frameworks and platforms such as Astro, Next.js, Cloudflare, AWS, and
others.

## Why OpenNav Exists

AI agents can already find pages. The hard part is using those pages reliably.
Most sites still make agents load full HTML documents, infer layout-specific
meaning, extract the useful text, and hope the next redesign does not break the
workflow.

| Problem              | What happens today                                  | What OpenNav changes                                                    |
|----------------------|-----------------------------------------------------|-------------------------------------------------------------------------|
| High token cost      | Agents read full pages to find one answer.          | Agents get clean Markdown and `llms` files designed for direct reading. |
| Slow execution       | Agents find, load, read, and extract before acting. | Agents discover readable resources from stable links and manifests.     |
| Inconsistent results | Every site's HTML structure is different.           | Sites expose predictable generated files and compatibility metadata.    |
| Fragility            | Layout changes can break agent behavior.            | Agent-facing artifacts stay separate from visual page layout.           |

OpenNav does not replace search engines, browsers, APIs, or agents. It occupies
the compatibility layer between discovery and execution.

| Layer         | Examples                      | Role                            |
|---------------|-------------------------------|---------------------------------|
| Discovery     | Google, Bing, Exa, Perplexity | Find the relevant page.         |
| Compatibility | OpenNav                       | Make the page usable by agents. |
| Execution     | AI agents and assistants      | Complete the user's task.       |

## Roadmap: The Agent Navigation Layer

OpenNav starts with static agent-ready sites because they are easy to inspect,
safe to publish, and require no backend changes. From there, the roadmap expands
into runtime integrations and broader publishing workflows as real sites show
what teams need next.

| Stage | Deliverable | What it means |
|-------|-------------|---------------|
| Launch Day 1 | Static agent-ready sites | Generate Markdown page artifacts, `llms.txt`, `llms-full.txt`, OpenNav metadata, HTML resource links, and configured crawler guidance. |
| Launch Day 2 | Runtime framework integrations | Add framework middleware and server hooks for dynamic Markdown responses, content negotiation, auth-aware docs, and larger sites. |
| Future | Broader agent-ready publishing | Keep expanding framework coverage, validation, and documentation around the publishing workflows teams actually use. |

The project stays disciplined: adoption first, then deeper navigation. The
open-source package should make agent compatibility a default part of publishing
a website, while the larger category becomes clear over time: a dedicated
navigation layer between AI agents and the web.

## Package

The planned public package is:

```txt
@opennav-ai/opennav
```

Install it as a development dependency once published:

```bash
npm install -D @opennav-ai/opennav
```

For projects that want it as a normal dependency, this installs the same
package:

```bash
npm install '@opennav-ai/opennav'
```

The package exposes:

- `OpenNavStaticSite` from `@opennav-ai/opennav`
- `OpenNavAstro` from `@opennav-ai/opennav/astro`
- `OpenNavNext` from `@opennav-ai/opennav/next`
- CLI binaries named `opennav` and `opennav-ai`

Use `opennav` in docs and scripts. Use `opennav-ai` as the fallback binary if
another package already owns the `opennav` command in a project.

The examples below describe the current Phase 1 package shape. The engine and
public `@opennav-ai/opennav` package exist in this repo today; the generic
`opennav static` command remains the main missing launch surface.

## Quick Start

Build your static site first, then run OpenNav against the generated folder.

```bash
npm run build
npx opennav static --output dist --site-url https://example.com --site-name "Example Docs" --dry-run
```

The dry run reports the files OpenNav would create or edit without writing to
the folder. When the report looks right, run the real write:

```bash
npx opennav static --output dist --site-url https://example.com --site-name "Example Docs" --full-run
```

Typical package script:

```json
{
  "scripts": {
    "build:static": "npm run build && opennav static --output dist --site-url https://example.com --site-name \"Example Docs\" --full-run"
  }
}
```

For Next.js static export:

```json
{
  "scripts": {
    "build": "next build && opennav static --preset next-export --output out --site-url https://example.com --site-name \"Example Docs\" --full-run"
  }
}
```

Phase 1 requires real static output. It works best when the build folder
contains prerendered route HTML such as `index.html`,
`docs/getting-started/index.html`, and `docs/api/index.html`.

## SDK Usage

Use the root SDK when a script or framework hook already knows the built output
folder.

```ts
import { OpenNavStaticSite } from "@opennav-ai/opennav";

const result = await new OpenNavStaticSite({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  outputDirectory: "dist",
  accessGuidance: {
    contentSignals: {
      search: "allow",
      aiInput: "allow",
      aiTrain: "disallow"
    }
  }
}).build({ dryRun: true });

if (result.isErr()) {
  console.error(result.error.message);
  process.exit(1);
}

console.log(result.value);
```

Successful runs return exact output-directory-relative file paths:

```ts
{
  createdFilePaths: [
    "llms.txt",
    ".well-known/llms.txt",
    "index.md",
    "llms-full.txt",
    ".well-known/llms-full.txt",
    ".well-known/opennav.json"
  ],
  modifiedFilePaths: ["index.html", "robots.txt"],
  skippedFilePaths: ["assets/logo.svg"],
  warnings: []
}
```

Expected failures return typed `OpenNavError` values through `neverthrow`
`Result` objects instead of throwing for normal validation, input, or filesystem
failure paths.

## Astro Usage

Astro static sites can run OpenNav after `astro build` through the Astro
integration.

```ts
import { defineConfig } from "astro/config";
import { OpenNavAstro } from "@opennav-ai/opennav/astro";

export default defineConfig({
  site: "https://example.com",
  integrations: [
    OpenNavAstro({
      siteName: "Example Docs",
      mode: "static"
    })
  ]
});
```

If `siteUrl` is omitted, the integration uses Astro's `site` value. Phase 1
supports only `mode: "static"` and defaults to that mode when omitted.

## Next.js Usage

Next.js support is for static export builds.

```ts
import { OpenNavNext } from "@opennav-ai/opennav/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export"
};

export default OpenNavNext({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  mode: "static"
})(nextConfig);
```

When a Next adapter hook is unavailable or another adapter already owns the
build lifecycle, use the CLI after `next build`:

```bash
opennav static --preset next-export --output out --site-url https://example.com --site-name "Example Docs" --full-run
```

## Options Reference

The planned CLI is the fastest way to add OpenNav after a static build. Once
implemented, pass `--dry-run` to preview the files OpenNav would create or edit,
then pass `--full-run` when you are ready to write those changes into the build
folder.

```bash
opennav static \
  --output dist \
  --site-url https://example.com \
  --site-name "Example Docs" \
  --preset generic \
  --dry-run
```

```bash
opennav static \
  --output dist \
  --site-url https://example.com \
  --site-name "Example Docs" \
  --preset generic \
  --full-run
```

| CLI option | Default | What it does | Built-file outcome |
|------------|---------|--------------|--------------------|
| `static` | Required subcommand | Selects the static output-folder workflow. | OpenNav scans files that already exist in the built folder. |
| `--output <dir>` | Required for generic runs | Points OpenNav at the folder your site build produced. | All created and modified files stay inside this folder. |
| `--site-url <url>` | Required unless provided by config or framework integration | Sets the public URL used for canonical links. | Generated Markdown, `llms` files, HTML resource links, and `.well-known/opennav.json` point at the correct public site. |
| `--site-name <name>` | Required unless provided by config or framework integration | Sets the human-readable site name agents see. | Used as the title in `llms.txt`, `llms-full.txt`, and related generated metadata. |
| `--preset <name>` | `generic` | Applies framework-aware output and scan behavior. Planned values include `generic`, `astro`, `next-export`, `docusaurus`, `vitepress`, and `eleventy`. | Keeps framework assets out of the engine input and focuses generation on HTML, Markdown, and `robots.txt`. |
| `--config <path>` | Auto-discovery when supported | Loads shared OpenNav settings from a config file instead of repeating every value in the command. | Can provide the same site settings used by the SDK, including structured access guidance that affects `robots.txt`. |
| `--dry-run` | `false` | Plans the run without writing. | Reports `createdFilePaths`, `modifiedFilePaths`, `skippedFilePaths`, and `warnings`; leaves the build folder unchanged. |
| `--full-run` | `false` | Confirms that OpenNav should write files. | Creates files such as `llms.txt`, `.well-known/opennav.json`, and Markdown page artifacts, then safely edits HTML pages and configured `robots.txt` guidance. |

For write safety, the CLI should use one execution intent at a time:
`--dry-run` to inspect the plan or `--full-run` to apply it.

Structured policies such as Content Signals are better represented in config or
SDK code than as long shell flags. When configured, they have the same file
outcome in every entrypoint: OpenNav creates or updates its managed
`robots.txt` guidance block without taking over the rest of the file.

The SDK exposes the same static workflow for scripts and framework hooks. This
example passes every supported option explicitly and notes the default next to
each optional value.

```ts
import { OpenNavStaticSite } from "@opennav-ai/opennav";

const result = await new OpenNavStaticSite({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  outputDirectory: "dist",
  preset: "generic", // default: "generic"
  accessGuidance: {
    // default: undefined, so OpenNav does not create or edit robots.txt for
    // Content Signals unless you explicitly configure this policy.
    contentSignals: {
      search: "allow",
      aiInput: "allow",
      aiTrain: "disallow"
    }
  }
}).build({
  dryRun: true // default: false
});

if (result.isErr()) {
  console.error(result.error.message);
  process.exit(1);
}

console.log(result.value);
```

| SDK option | Default | What it does | Built-file outcome |
|------------|---------|--------------|--------------------|
| `siteName` | Required | Sets the name agents see when they inspect the generated site index. | Appears in `llms.txt`, `llms-full.txt`, and generated metadata. |
| `siteUrl` | Required | Sets the public origin used to build canonical URLs. | Controls links in Markdown artifacts, `llms` files, HTML resource links, and `.well-known/opennav.json`. |
| `outputDirectory` | Required | Points the SDK at the built static folder. | OpenNav reads from and writes to this folder only. |
| `preset` | `generic` | Tunes scanning for a known framework output shape. | Helps skip framework assets and process the page-like files agents can use. |
| `accessGuidance.contentSignals.search` | Omitted | Expresses whether search indexing and snippets are allowed. | When configured, writes `search=yes` or `search=no` into OpenNav-managed `robots.txt` Content Signals guidance. |
| `accessGuidance.contentSignals.aiInput` | Omitted | Expresses whether real-time AI input use, such as grounding or retrieval, is allowed. | When configured, writes `ai-input=yes` or `ai-input=no` into `robots.txt`. |
| `accessGuidance.contentSignals.aiTrain` | Omitted | Expresses whether model training or fine-tuning use is allowed. | When configured, writes `ai-train=yes` or `ai-train=no` into `robots.txt`. |
| `build({ dryRun })` | `false` | Chooses whether to preview or write the plan. | `true` reports planned changes only; `false` writes generated files and safe edits. |

Successful CLI and SDK runs report the same concrete result fields:

| Result field | Meaning |
|--------------|---------|
| `createdFilePaths` | Output-directory-relative paths OpenNav created, or would create during `--dry-run`. |
| `modifiedFilePaths` | Existing output-directory-relative paths OpenNav edited, or would edit during `--dry-run`. |
| `skippedFilePaths` | Paths OpenNav saw but intentionally ignored, such as assets or unsupported files. |
| `warnings` | Non-fatal typed issues, such as unsupported files or recoverable guidance conflicts. |

## What OpenNav Writes

OpenNav creates or updates only files inside the configured static output
folder.

| File                        | Purpose                                                                              |
|-----------------------------|--------------------------------------------------------------------------------------|
| `llms.txt`                  | Root agent-readable site index.                                                      |
| `.well-known/llms.txt`      | Well-known copy of the site index.                                                   |
| `llms-full.txt`             | Combined readable page content when the site fits within the configured token limit. |
| `.well-known/llms-full.txt` | Well-known copy of the full readable content file.                                   |
| `.well-known/opennav.json`  | Static compatibility manifest with artifact paths and build fingerprint.             |
| `*.md` page artifacts       | Markdown mirrors for HTML pages, such as `docs/api/index.md`.                        |
| `*.html` pages              | Safe `<head>` links pointing to Markdown mirrors and `llms.txt`.                     |
| `robots.txt`                | Optional Content Signals guidance when configured by the caller.                     |

OpenNav skips unsupported files such as JavaScript, CSS, source maps, images,
fonts, media, archives, framework payload files, platform routing files, and
static HTTP error pages like `404.html` and `500.html`.

## Planned Static Outputs

The generic CLI path is intended to work with any framework that writes real
static HTML or Markdown files to disk.

| Framework or generator     | Common output folder | Phase 1 support                       |
|----------------------------|----------------------|---------------------------------------|
| Astro                      | `dist`               | First-class static integration        |
| Astro Starlight            | `dist`               | Covered by Astro static integration   |
| Next.js static export      | `out`                | First-class static export integration |
| Docusaurus                 | `build`              | Generic static-folder support         |
| VitePress                  | `.vitepress/dist`    | Generic static-folder support         |
| Eleventy                   | `_site`              | Generic static-folder support         |
| Gatsby                     | `public`             | Generic static-folder support         |
| SvelteKit `adapter-static` | `build`              | Generic static-folder support         |
| Hugo                       | `public`             | Generic static-folder support         |
| Jekyll                     | `_site`              | Generic static-folder support         |
| MkDocs                     | `site`               | Generic static-folder support         |

Phase 1 does not claim complete coverage for SSR-only apps, middleware,
serverless functions, dynamic routes rendered only at request time, or pure SPA
shells that emit one generic `index.html`.

## Current Repo Status

This repository is the public OpenNav AI npm workspace. The engine side of
Phase 1 is implemented, and the public launch package now exists.

```txt
packages/
  engine/    @opennav-ai/engine, the static generation engine
  opennav/   @opennav-ai/opennav, the public SDK, framework, and CLI shell
```

Implemented today:

- `Engine.execute(...)` reads built file paths from a static output folder.
- The engine validates site and page metadata in strict mode.
- The engine plans and writes `llms` files, Markdown page artifacts, the
  OpenNav manifest, HTML resource links, and configured `robots.txt` Content
  Signals guidance.
- Dry-run mode reports exact planned creates and modifications without writing.
- Successful results include `createdFilePaths`, `modifiedFilePaths`,
  `skippedFilePaths`, and `warnings`.
- `OpenNavStaticSite.build()` runs the shared static-folder SDK path.
- `OpenNavAstro({ mode: "static" })` runs after Astro static builds.

Not implemented yet:

- `opennav static`
- automatic Next post-build execution through `OpenNavNext`

## Development

Install dependencies:

```bash
npm install
```

Run the workspace checks:

```bash
npm run build
npm run lint
npm test
```

Run the Phase 1 engine fixture:

```bash
npm run fixture:engine:phase1:write
```

That command copies
`packages/engine/fixtures/phase-1-small-site/dist/` into
`packages/engine/.manual-runs/phase-1-small-site/dist/`, runs the engine with
`dryRun: false`, and writes `build-result.json` next to the generated output.

## Next Work Item

The next Phase 1 work items are to finish `opennav static`, design Next output
normalization for full-output example snapshots, and wire `OpenNavNext(...)`
once the supported Next adapter path is agreed.
