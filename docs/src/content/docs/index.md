---
title: OpenNav AI
description: Publish static sites with predictable files that AI agents can read directly.
template: splash
hero:
  title: OpenNav AI
  tagline: The open standard for agent navigation.
  image:
    file: ../../assets/open-logo.svg
    alt: OpenNav AI logo
  actions:
    - text: Get Started
      link: /getting-started/
      icon: right-arrow
      variant: primary
    - text: CLI Reference
      link: /cli/
      icon: setting
      variant: minimal
---

OpenNav makes built static sites easier for AI agents to use. Run it after your
existing site build and it creates the files agents need: `llms.txt`,
`llms-full.txt`, Markdown page mirrors, `/.well-known/opennav.json`, HTML
resource links, and optional `robots.txt` Content Signals guidance.

## Pick Your Hook

| Hook | Use it when | Start here |
| ---- | ----------- | ---------- |
| TypeScript SDK | You already know the built output folder. | [SDK Reference](/sdk/) |
| Astro | You want OpenNav to run after `astro build`. | [Astro Guide](/frameworks/astro/) |
| Next.js | You use Next.js static export. | [Next.js Guide](/frameworks/next/) |
| CLI | You want a build-step command. | [CLI Reference](/cli/) |
| Static site platforms | You deploy a finished folder to Cloudflare Pages, Netlify, Vercel static output, GitHub Pages, S3-compatible hosting, or a CDN. | [Static Site Platforms](#static-site-platforms) |
| Server-side Astro and Next.js | You want runtime Markdown content negotiation. Coming soon. | [Server-Side Roadmap](/frameworks/server-side/) |

## Static Site Platforms

OpenNav works with static output, so it fits the hosting platforms teams already
use for documentation, marketing sites, and exported apps. Build your site,
run OpenNav against the finished folder, and deploy the folder to platforms such
as Cloudflare Pages, Netlify, Vercel static output, GitHub Pages,
S3-compatible hosting, or any CDN that serves plain files.

The static workflow is deployment-platform agnostic. OpenNav reads the generated
HTML, writes agent-readable files beside it, and leaves your hosting stack to
serve the result.

## What OpenNav Adds

| File or edit | What agents can use it for |
| ------------ | -------------------------- |
| `llms.txt` | Discover the readable site index. |
| `llms-full.txt` | Read combined page content when the site fits the configured limit. |
| `*.md` page artifacts | Read page content without parsing visual HTML. |
| `/.well-known/opennav.json` | Check static compatibility metadata and generated artifact paths. |
| HTML resource links | Discover Markdown mirrors and `llms.txt` from each page. |
| `robots.txt` guidance | Read configured Content Signals preferences when provided. |

## TypeScript SDKs

Use the CLI for any finished static folder, or use the TypeScript SDK when your
build already knows the output path. OpenNav includes framework helpers for
Astro static builds and Next.js static export builds, with more framework
integrations planned for upcoming releases.

| Path | Supported now | Best fit |
| ---- | ------------- | -------- |
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

See the [server-side roadmap](/frameworks/server-side/) for the planned Astro
and Next.js runtime integrations.
