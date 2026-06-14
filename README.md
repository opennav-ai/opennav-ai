# ![OpenNav AI](./assets/full-open-logo-white-bg-padded.svg)

## The AI Web Compatibility Layer

Search finds pages. OpenNav makes websites usable by AI agents.

AI agents are becoming a new class of web visitor, but most websites still only
publish a human interface: visual layouts, changing HTML, navigation chrome,
and page structure that agents have to infer from presentation code.

That creates the gap OpenNav exists to close. Search engines help agents find a
page. Browsers let agents open it. OpenNav gives agents the compatibility layer
after discovery: a predictable way to discover what a site published, read clean
page content, and inspect compatibility metadata without treating every page as
a one-off scraping job.

| Layer | What it does | Example |
| ----- | ------------ | ------- |
| Discovery | Finds the relevant page. | Search, AI search, links |
| Compatibility | Makes the page usable by agents. | OpenNav |
| Execution | Uses the page to complete the task. | AI agents and browsers |

OpenNav works with both static and server-rendered sites. For static output, run
it after your existing build — it reads `dist/`, `out/`, `build/`, or `site/`
and writes an agent-readable layer beside the files you already deploy. For
server-rendered pages, use `OpenNavServer` for runtime `Accept: text/markdown`
content negotiation — same URL serves HTML to browsers and Markdown to agents.

The result is a normal website with a stable reading path for agents: clean
Markdown instead of visual HTML scraping, predictable discovery files instead
of layout-specific extraction, and compatibility metadata tools can check
without guessing.

OpenNav does not call an LLM, crawl the public internet, edit your source files,
or deploy your site. Your existing build and hosting workflow stays in charge.

- Package: `@opennav-ai/opennav`
- GitHub: [opennav-ai/opennav-ai](https://github.com/opennav-ai/opennav-ai)
- Website: [OpenNav.ai](https://OpenNav.ai)
- Docs site: [docs.opennav.ai](https://docs.opennav.ai)
- Local docs source: [`docs/`](./docs/)

## Start Quickly

Install OpenNav in the project that builds your static site:

```bash
npm install -D @opennav-ai/opennav
```

Run it after your normal static build:

```bash
npm run build
npx opennav build --static --output dist --site-url https://example.com --site-name "Example Docs"
```

Use `--dry-run` first when you want to preview the exact files OpenNav would
create, modify, or skip:

```bash
npx opennav build --static \
  --output dist \
  --site-url https://example.com \
  --site-name "Example Docs" \
  --dry-run
```

In npm scripts, use the package binary directly:

```json
{
  "scripts": {
    "build": "astro build && opennav build --static --output dist --site-url https://example.com --site-name \"Example Docs\""
  }
}
```

## Cloudflare Pages Quick Path

Cloudflare Pages is the clearest place to make a site agent-ready today. Pages
already deploys a finished static folder, so OpenNav can run as the final build
step before Cloudflare publishes that folder.

| Cloudflare path | Start here |
| --------------- | ---------- |
| Pages with any static output folder | Run `opennav build --static` after your normal build. |
| Pages with Astro | Use `OpenNavAstro` to run after `astro build`. |
| Pages with Next.js static export | Use `OpenNavNext` with `output: "export"`. |
| Workers or Pages Functions | Deploy static `.md` files for zero CPU. Use `OpenNavServer` for runtime `Accept: text/markdown` negotiation on SSR routes with a [Cloudflare Pages Function](https://docs.opennav.ai/platforms/cloudflare/#cloudflare-pages-functions). |

Set your Pages build command to run the same script you use locally, and publish
the same output folder (`dist/`, `out/`, `build/`, or your framework output).
OpenNav writes files into that folder only.

## What OpenNav Adds

OpenNav scans the built output folder and creates or updates only files inside
that folder.

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
  index.html                         # links to agent-readable resources
  docs/getting-started/index.html    # links to agent-readable resources
  docs/api/index.html                # links to agent-readable resources
  robots.txt                         # optional Content Signals guidance
```

| File or edit | What agents can use it for |
| ------------ | -------------------------- |
| `llms.txt` | Discover the readable site index. |
| `llms-full.txt` | Read combined page content when the site fits the configured limit. |
| `*.md` page artifacts | Read page content without parsing visual HTML. |
| `/.well-known/opennav.json` | Check static compatibility metadata and generated artifact paths. |
| HTML resource links | Discover Markdown mirrors and `llms.txt` from each page. |
| `robots.txt` guidance | Read configured Content Signals preferences when provided. |

Successful runs return output-directory-relative paths so build scripts and CI
can show exactly what happened:

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

Expected validation, input, and filesystem failures return typed `neverthrow`
`Result` errors instead of throwing for normal failure paths.

## Pick Your Hook

All entrypoints run the same static output-folder workflow. Choose the one that
fits the place where your build already knows the output path.

| Hook | Use it when | Import or command |
| ---- | ----------- | ----------------- |
| CLI | You want the smallest build-step setup. | `opennav build --static` |
| TypeScript SDK | A custom Node script already knows the output folder. | `OpenNavStaticSite` from `@opennav-ai/opennav` |
| Astro | You want OpenNav to run after `astro build`. | `OpenNavAstro` from `@opennav-ai/opennav/astro` |
| Next.js | You use Next.js static export. | `OpenNavNext` from `@opennav-ai/opennav/next` |
| Server-side | You want runtime `Accept: text/markdown` content negotiation. | `OpenNavServer` from `@opennav-ai/opennav/server` |

## TypeScript SDK

Use the root SDK from a build hook, Node script, or custom workflow.

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

## Framework Helpers

Astro static sites can run OpenNav after `astro build`:

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

Next.js support is for static export builds:

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

## Static Site Support

OpenNav works with files you can deploy to Cloudflare Pages, Netlify, Vercel
static output, GitHub Pages, S3-compatible hosting, or any CDN that serves
plain files.

| Site output | Current support |
| ----------- | --------------- |
| Astro and Astro Starlight | First-class static integration. |
| Next.js `output: "export"` | First-class static export integration. |
| Docusaurus, VitePress, Eleventy, Hugo, Jekyll, MkDocs | Generic static-folder support. |
| Any folder of real HTML or Markdown files | Generic static-folder support. |

For server-rendered pages, use the `OpenNavServer` class for runtime
`Accept: text/markdown` content negotiation — see [Server-Side](#server-side-content-negotiation).

## Access Guidance

`accessGuidance` is optional. If omitted, OpenNav does not create or edit
`robots.txt` for Content Signals.

Use it when you want the generated static output to include machine-readable
content-use preferences in `robots.txt`:

```ts
accessGuidance: {
  contentSignals: {
    search: "allow",
    aiInput: "allow",
    aiTrain: "disallow"
  }
}
```

With that configuration, OpenNav writes a managed directive such as:

```txt
Content-signal: search=yes, ai-input=yes, ai-train=no
```

This is guidance, not enforcement. OpenNav does not block requests, add auth, or
change server behavior.

## Server-Side Content Negotiation

`OpenNavServer` handles runtime `Accept: text/markdown` content negotiation.
When a client sends the right Accept header, the server converts the HTML
response to clean Markdown on-the-fly. Browser requests still receive normal
HTML. Works with any WinterCG-compatible runtime.

`OpenNavServer` exposes three methods at increasing levels of control:

| Method | When to use |
| ------ | ----------- |
| `negotiate({ request, htmlResponse })` | Full pipeline — accept header → decision → response. The default. |
| `accept(request)` | Need the Accept decision *before* fetching or rendering. Sync, no I/O. |
| `toMarkdown({ request, htmlResponse })` | Already know Markdown is needed (cache miss, markdown-only endpoint). |

See the [server-side guide](https://docs.opennav.ai/frameworks/server-side/)
for framework examples (Hono, Astro SSR, Next.js, Cloudflare Workers) and the
"Choosing a Method" section for when to use each method.

## Learn More

- Getting started: [docs.opennav.ai/getting-started](https://docs.opennav.ai/getting-started/)
- CLI reference: [docs.opennav.ai/cli](https://docs.opennav.ai/cli/)
- SDK reference: [docs.opennav.ai/sdk](https://docs.opennav.ai/sdk/)
- Astro guide: [docs.opennav.ai/frameworks/astro](https://docs.opennav.ai/frameworks/astro/)
- Next.js guide: [docs.opennav.ai/frameworks/next](https://docs.opennav.ai/frameworks/next/)
- Generated files reference: [docs.opennav.ai/reference/generated-files](https://docs.opennav.ai/reference/generated-files/)
- Access guidance reference: [docs.opennav.ai/reference/access-guidance](https://docs.opennav.ai/reference/access-guidance/)
- Server-side guide: [docs.opennav.ai/frameworks/server-side](https://docs.opennav.ai/frameworks/server-side/)
- Changelog: [docs.opennav.ai/changelog](https://docs.opennav.ai/changelog/)
- Cloudflare Agent Readiness: [blog.cloudflare.com/agent-readiness](https://blog.cloudflare.com/agent-readiness/)

## Workspace

This repository is the OpenNav AI npm workspace.

```txt
packages/
  engine/    private static generation engine compiled into the public package
  opennav/   @opennav-ai/opennav SDK, framework helpers, and CLI package
docs/        Astro Starlight documentation site
examples/    framework fixtures and example projects
```

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

Run the example compatibility tests:

```bash
npm run test:examples
```
