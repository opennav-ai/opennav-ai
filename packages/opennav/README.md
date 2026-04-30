# @opennav-ai/opennav

The compatibility and navigation layer for AI agents.

Search can find a page. OpenNav makes that page usable by agents. Run it after
your static site build and it adds predictable files, Markdown page mirrors,
machine-checkable compatibility metadata, and safe page links that agents can
discover without reverse-engineering your visual layout.

- Website: [opennav-ai.com](https://opennav-ai.com)
- Docs: [docs.opennav-ai.com](https://docs.opennav-ai.com)
- Package: `@opennav-ai/opennav`

## Install

```bash
npm install -D @opennav-ai/opennav
```

Install without `-D` if OpenNav runs from runtime application code rather than
a build script.

## Pick Your Hook

| Hook | Use it when | Import or command |
| ---- | ----------- | ----------------- |
| TypeScript SDK | You already know the built output folder. | `OpenNavStaticSite` from `@opennav-ai/opennav` |
| Astro | You want OpenNav to run after `astro build`. | `OpenNavAstro` from `@opennav-ai/opennav/astro` |
| Next.js | You use Next.js static export. | `OpenNavNext` from `@opennav-ai/opennav/next` |
| CLI | You want a build-step command. | `opennav build --static` |

## TypeScript SDK

Use the root SDK from any build hook, Node script, or custom workflow.

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

Full example with optional static preset, access guidance, and dry run:

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
			aiTrain: "disallow",
		},
	},
}).build({ dryRun: true });
```

## Astro

Run OpenNav automatically after an Astro static build.

```ts
import { defineConfig } from "astro/config";
import { OpenNavAstro } from "@opennav-ai/opennav/astro";

export default defineConfig({
	site: "https://example.com",
	integrations: [
		OpenNavAstro({
			siteName: "Example Docs",
			mode: "static",
		}),
	],
});
```

If `siteUrl` is omitted, the integration uses Astro's top-level `site` value.

## Next.js

Run OpenNav after a supported Next.js static export build.

```ts
import { OpenNavNext } from "@opennav-ai/opennav/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "export",
};

export default OpenNavNext({
	siteName: "Example Docs",
	siteUrl: "https://example.com",
	mode: "static",
})(nextConfig);
```

`OpenNavNext` reads from `out` by default. Pass `outputDirectory` when your
export folder is different.

## CLI

Use the CLI when OpenNav is easiest as the final step in a static build.

```bash
opennav build --static --output dist --site-url https://example.com --site-name "Example Docs"
```

Preview the file plan without writing:

```bash
opennav build --static --output dist --site-url https://example.com --site-name "Example Docs" --dry-run
```

The package also exposes an `opennav-ai` binary as a fallback if another package
already owns the `opennav` command in your project.

## What OpenNav Adds

OpenNav reads a finished static output folder such as `dist`, `out`, `build`,
or `site`, then creates or updates files inside that folder only.

```txt
dist/
  llms.txt
  llms-full.txt
  .well-known/llms.txt
  .well-known/llms-full.txt
  .well-known/opennav.json
  index.md
  docs/getting-started/index.md
  index.html                         # links to agent-readable resources
  docs/getting-started/index.html    # links to agent-readable resources
  robots.txt                         # optional Content Signals guidance
```

| Output | Why agents use it |
| ------ | ----------------- |
| `llms.txt` | Find the important readable resources for the site. |
| `llms-full.txt` | Read combined page content when the site fits within the token budget. |
| `/.well-known/opennav.json` | Check compatibility metadata, generated artifact paths, and build fingerprint. |
| `*.md` page mirrors | Read clean Markdown for HTML pages. |
| HTML resource links | Discover Markdown mirrors and `llms` files from the original page. |
| `robots.txt` guidance | Read optional site-owner Content Signals preferences. |

Successful runs return output-directory-relative paths:

```ts
{
	createdFilePaths: ["llms.txt", ".well-known/opennav.json", "index.md"],
	modifiedFilePaths: ["index.html"],
	skippedFilePaths: ["assets/logo.svg"],
	warnings: [],
}
```

Expected validation, input, and filesystem failures return `neverthrow`
`Result` errors instead of throwing for normal failure paths.

## Static Site Support

OpenNav is built for static output first. It works with files you can deploy to
Cloudflare Pages, Netlify, Vercel static output, GitHub Pages, S3-compatible
hosting, and any CDN or server that serves plain files.

| Site output | Current support |
| ----------- | --------------- |
| Astro and Astro Starlight | First-class static integration. |
| Next.js `output: "export"` | First-class static export integration. |
| Docusaurus, VitePress, Eleventy, Hugo, Jekyll, MkDocs | Generic static-folder support. |
| Any folder of real HTML or Markdown files | Generic static-folder support. |

OpenNav does not claim full coverage for SSR-only apps, request-time dynamic
routes, serverless functions, or pure SPA shells that emit one generic
`index.html`.

## Server-Side Roadmap

Server-side Astro and Next.js support is planned after the static launch path.
That work will add Markdown content negotiation for runtime pages, with both
site-wide and per-endpoint middleware options.

Static output is supported today. Server-side framework support is coming next.

## Options

### `OpenNavStaticSite`

| Option | Required | Meaning |
| ------ | -------- | ------- |
| `siteName` | Yes | Human-readable site or docs name written into generated OpenNav files. |
| `siteUrl` | Yes | Public deployed site URL, including protocol and host. |
| `outputDirectory` | Yes | Built static folder OpenNav reads from and writes to. |
| `preset` | No | Static framework hint: `"astro"` or `"next-export"`. |
| `accessGuidance` | No | Optional Content Signals preferences for generated `robots.txt` guidance. |
| `build({ dryRun })` | No | `true` previews planned changes; omitted or `false` writes files. |

### Framework Hooks

| Option | Astro | Next.js |
| ------ | ----- | ------- |
| `siteName` | Required. | Required. |
| `siteUrl` | Optional when Astro `site` is set. | Required. |
| `mode` | Optional. Defaults to `"static"`. | Optional. Defaults to `"static"`. |
| `outputDirectory` | Uses Astro's build `dir`, normally `dist`. | Optional. Defaults to `out`. |
| `accessGuidance` | Optional. Affects `dist/robots.txt` only when configured. | Optional. Affects `out/robots.txt` only when configured. |

## Access Guidance

`accessGuidance` is optional. If omitted, OpenNav does not create or edit
`robots.txt` for Content Signals.

```ts
accessGuidance: {
	contentSignals: {
		search: "allow",
		aiInput: "allow",
		aiTrain: "disallow",
	},
}
```

This writes a managed directive such as:

```txt
Content-signal: search=yes, ai-input=yes, ai-train=no
```

This is guidance, not enforcement. OpenNav does not block requests, add auth, or
change server behavior.

## Learn More

- Getting started: [docs.opennav-ai.com/getting-started](https://docs.opennav-ai.com/getting-started/)
- SDK reference: [docs.opennav-ai.com/sdk](https://docs.opennav-ai.com/sdk/)
- Astro guide: [docs.opennav-ai.com/frameworks/astro](https://docs.opennav-ai.com/frameworks/astro/)
- Next.js guide: [docs.opennav-ai.com/frameworks/next](https://docs.opennav-ai.com/frameworks/next/)
- Server-side roadmap: [docs.opennav-ai.com/frameworks/server-side](https://docs.opennav-ai.com/frameworks/server-side/)
