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

## Static Site Platforms

OpenNav works with static output, so it fits the hosting platforms teams already
use for documentation, marketing sites, and exported apps. Build your site, run
OpenNav against the finished folder, and deploy the folder to platforms such as
Cloudflare Pages, Netlify, Vercel static output, GitHub Pages, S3-compatible
hosting, or any CDN that serves plain files.

The static workflow is deployment-platform agnostic. OpenNav reads the generated
HTML, writes agent-readable files beside it, and leaves your hosting stack to
serve the result.

## TypeScript SDKs

Use the CLI for any finished static folder, or use the TypeScript SDK when your
build already knows the output path. OpenNav includes framework helpers for
Astro static builds and Next.js static export builds, with more framework
integrations planned for upcoming releases.

| Path | Supported now | Best fit |
|------|---------------|----------|
| CLI | Any finished static output folder. | Existing build scripts and CI pipelines. |
| TypeScript SDK | Direct static output folder control. | Custom Node scripts and build hooks. |
| Astro helper | Astro static builds. | `astro build` projects that publish `dist/`. |
| Next.js helper | Next.js static export builds. | `output: "export"` projects that publish `out/`. |

## Server-Side Roadmap

Launch Day 1 focuses on real static output folders such as `dist/`, `out/`,
`build/`, and framework-specific static export directories.

Server-side Astro and Next.js support is the next track. That work will add
Markdown content negotiation for runtime routes, with site-wide middleware and
per-endpoint middleware options so apps can return agent-readable Markdown from
server-rendered pages without requiring every route to be exported first.

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
| Launch Day 2 | Server-side Astro and Next.js integrations | Add Markdown content negotiation for runtime routes, with site-wide and per-endpoint middleware options. |
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

The examples in [`examples/`](./examples/README.md) are quick-start guides. The
reference below is the canonical place for option behavior and file outcomes.

## Quick Start

Run OpenNav after your existing static build command:

```bash
opennav build --static --output dist --site-url https://example.com --site-name "Example Docs"
```

The command expects real static output. It works best when the output folder
already contains prerendered route HTML such as `index.html`,
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
}).build();

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
  modifiedFilePaths: ["index.html"],
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

If `siteUrl` is omitted, the integration uses Astro's `site` value. Static mode
is the supported Astro integration mode and is used when `mode` is omitted.

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

## Entrypoints And Options Reference

All entrypoints run the same static output-folder workflow. They differ only in
where the options come from.

| Entrypoint | Use it when | Output folder |
|------------|-------------|---------------|
| CLI `opennav build --static` | You already have a shell build command and want the smallest setup. | `--output` |
| `OpenNavStaticSite` | You want to call OpenNav from your own Node script. | `outputDirectory` |
| `OpenNavAstro` | You want Astro to run OpenNav after `astro build`. | Astro's build `dir`, normally `dist` |
| `OpenNavNext` | You want Next static export to run OpenNav after `next build`. | `outputDirectory`, default `out` |

### CLI Options

```bash
opennav build --static \
  --output dist \
  --site-url https://example.com \
  --site-name "Example Docs"
```

Add `--dry-run` to preview without writing.

| CLI option | Required | What it means | File outcome |
|------------|----------|---------------|--------------|
| `build` | Yes | Runs the build command. This is the only CLI command currently supported. | Starts the static OpenNav workflow. |
| `--static` | Yes | Treats `--output` as a finished static-site folder. | OpenNav scans existing HTML, Markdown, and `robots.txt` files in the folder. |
| `--output <directory>` | Yes | Built output folder, such as `dist`, `out`, or `build`. | All created and modified files stay inside this folder. |
| `--site-url <url>` | Yes | Public deployed site URL, including protocol and host. | Generated Markdown, `llms` files, HTML resource links, and `/.well-known/opennav.json` use this URL. |
| `--site-name <name>` | Yes | Human-readable site or docs name. | Appears in `llms.txt`, `llms-full.txt`, and generated metadata. |
| `--preset <preset>` | No | Framework hint. Supported values are `astro` and `next-export`. | Passes the same preset to the static SDK; leave it off for a plain static folder. |
| `--dry-run` | No | Preview mode. | Reports planned created, modified, skipped, and warning paths without changing files. |

The CLI writes files by default. There is no `--full-run` flag.

### OpenNavStaticSite Options

```ts
import { OpenNavStaticSite } from "@opennav-ai/opennav";

const result = await new OpenNavStaticSite({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  outputDirectory: "dist",
  preset: "astro",
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

| SDK option | Required | What it means | File outcome |
|------------|----------|---------------|--------------|
| `siteName` | Yes | Human-readable site or docs name. | Appears in `llms.txt`, `llms-full.txt`, and generated metadata. |
| `siteUrl` | Yes | Public deployed site URL, including protocol and host. | Controls links in Markdown artifacts, `llms` files, HTML resource links, and `/.well-known/opennav.json`. |
| `outputDirectory` | Yes | Built static folder to read and modify. | OpenNav reads from and writes to this folder only. |
| `preset` | No | Framework hint. Supported values are `"astro"` and `"next-export"`. | Uses framework-specific static folder conventions when available. |
| `accessGuidance` | No | Site-owner access preferences for generated policy guidance. | Only affects `robots.txt`, and only when configured. See the dedicated section below. |
| `build({ dryRun })` | No | Preview mode when `dryRun: true`. | `true` leaves files unchanged; omitted or `false` writes generated files and safe edits. |

### OpenNavAstro Options

```ts
OpenNavAstro({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  mode: "static",
  accessGuidance: {
    contentSignals: {
      aiTrain: "disallow"
    }
  }
});
```

| Astro option | Required | What it means | File outcome |
|--------------|----------|---------------|--------------|
| `siteName` | Yes | Human-readable site or docs name. | Appears in generated OpenNav files. |
| `siteUrl` | No when Astro `site` is set | Public deployed site URL. If omitted, OpenNav uses Astro's top-level `site`. | Controls generated links and manifest URLs. |
| `mode` | No | Static mode. Defaults to `"static"`. | OpenNav runs only for Astro static output. |
| `accessGuidance` | No | Same access policy object used by the SDK. | Only affects `dist/robots.txt`, and only when configured. |

### OpenNavNext Options

```ts
OpenNavNext({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  mode: "static",
  outputDirectory: "out"
})(nextConfig);
```

| Next option | Required | What it means | File outcome |
|-------------|----------|---------------|--------------|
| `siteName` | Yes | Human-readable site or docs name. | Appears in generated OpenNav files. |
| `siteUrl` | Yes | Public deployed site URL. | Controls generated links and manifest URLs. |
| `mode` | No | Static export mode. Defaults to `"static"`. | OpenNav runs only when Next config uses `output: "export"`. |
| `outputDirectory` | No | Static export folder. Defaults to `out`. | OpenNav reads and writes that folder after `next build`. |
| `accessGuidance` | No | Same access policy object used by the SDK. | Only affects `out/robots.txt`, and only when configured. |

## Access Guidance And `robots.txt`

`accessGuidance` is optional. If you omit it, OpenNav does not create or edit
`robots.txt` for Content Signals.

Use it when you want the generated static output to include machine-readable
content-use preferences in `robots.txt`.

This is guidance, not enforcement. OpenNav does not block requests, add auth, or
change server behavior. It writes a `robots.txt` policy signal that compliant
crawlers and AI systems can read.

```ts
accessGuidance: {
  contentSignals: {
    search: "allow",
    aiInput: "allow",
    aiTrain: "disallow"
  }
}
```

The configured fields become one `Content-signal` directive:

| Field | `allow` writes | `disallow` writes | Meaning |
|-------|----------------|-------------------|---------|
| `search` | `search=yes` | `search=no` | Whether search indexing and search snippets are allowed. |
| `aiInput` | `ai-input=yes` | `ai-input=no` | Whether real-time AI input use, such as grounding or retrieval, is allowed. |
| `aiTrain` | `ai-train=yes` | `ai-train=no` | Whether model training or fine-tuning use is allowed. |

With the example above, OpenNav writes:

```txt
Content-signal: search=yes, ai-input=yes, ai-train=no
```

If `robots.txt` does not exist, OpenNav creates it:

```txt
# Begin OpenNav AI
# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:..." manifest="/.well-known/opennav.json"
User-agent: *
Content-signal: search=yes, ai-input=yes, ai-train=no
# End OpenNav AI
```

If `robots.txt` already has a `User-agent: *` group, OpenNav inserts its managed
block inside that group. If there is no wildcard group, OpenNav appends one. On
later runs, OpenNav replaces only the block between `# Begin OpenNav AI` and
`# End OpenNav AI`.

OpenNav will not overwrite unmanaged Content Signals. If `robots.txt` already
contains a `Content-signal:` line outside the OpenNav managed block, OpenNav
returns a warning instead of changing that file.

An empty policy such as `contentSignals: {}` does not write a directive. At
least one of `search`, `aiInput`, or `aiTrain` must be configured.

## Result Fields

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

## Static Output Support

OpenNav works with frameworks and generators that write real static HTML or
Markdown files to disk.

| Framework or generator     | Common output folder | Support                               |
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

The static launch path does not claim complete coverage for SSR-only apps,
middleware, serverless functions, dynamic routes rendered only at request time,
or pure SPA shells that emit one generic `index.html`.

Server-side Astro and Next.js support is planned after the static launch path,
with Markdown content negotiation through site-wide and per-endpoint middleware.

## Current Repo Status

This repository is the public OpenNav AI npm workspace.

```txt
packages/
  engine/    internal static generation engine compiled into the public package
  opennav/   @opennav-ai/opennav, the public SDK, framework, and CLI package
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
- `opennav build --static` runs the CLI static-folder path.
- `OpenNavStaticSite.build()` runs the shared static-folder SDK path.
- `OpenNavAstro({ mode: "static" })` runs after Astro static builds.
- `OpenNavNext({ mode: "static" })` runs after supported Next static exports.

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

Run the engine fixture:

```bash
npm run fixture:engine:phase1:write
```

That command copies
`packages/engine/fixtures/phase-1-small-site/dist/` into
`packages/engine/.manual-runs/phase-1-small-site/dist/`, runs the engine with
`dryRun: false`, and writes `build-result.json` next to the generated output.

Run the example compatibility tests:

```bash
npm run test:examples
```
