---
title: OpenNav AI
description: The open standard for making websites usable by AI agents.
template: splash
hero:
  title: OpenNav AI
  tagline: Make your website usable by AI agents.
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

Search finds pages. OpenNav makes websites usable.

AI agents are becoming a new class of web visitor, but the web still gives them
a human interface: visual layouts, changing HTML, navigation chrome, and pages
that hide the readable path inside presentation code.

That makes agent work slower, more expensive, and less reliable. OpenNav fixes
the missing layer between discovery and execution: a predictable interface that
lets agents discover, navigate, read, and respect a site without treating every
page like a one-off scraping job.

## The Agent Navigation Layer

Search engines find the page. Browser agents can open it. APIs help when a site
already built one.

OpenNav owns the compatibility layer after discovery: the part where an agent
needs to know what exists, where to go, what to read, and which access
preferences the site published.

The goal is simple: agents should expect OpenNav, and websites should support
it as a standard part of being usable on the agent web.

## Use It Today: Static Sites

The first OpenNav release starts with static output because it gives teams an
immediate, inspectable win. Add one build step, deploy the same folder, and your
site gains an agent-readable layer beside the HTML people already use.

Point OpenNav at a finished folder such as `dist/`, `out/`, `build/`, or
`site/`. Your source files, hosting provider, CDN, and human-facing pages stay
in charge. OpenNav changes only the built output folder.

OpenNav works with documentation sites, marketing sites, and exported apps that
produce real HTML or Markdown files. It fits deploys to Cloudflare Pages,
Netlify, Vercel static output, GitHub Pages, S3-compatible hosting, and any CDN
that serves plain files.

## Cloudflare Pages Teams

Cloudflare Pages is the clearest place to make a site agent-ready today. Pages
already deploys a finished static folder, and OpenNav can run as the final build
step before that folder ships.

If you are exploring Workers, AI Gateway, or agent access patterns around a
Cloudflare site, start with the static layer first: publish `llms.txt`, Markdown
page mirrors, `/.well-known/opennav.json`, and optional Content Signals guidance
with the same deploy. On Cloudflare Pages, `platform: "cloudflare-pages"` or
`--platform cloudflare-pages` also creates `_headers` by default so those
generated files ship with explicit response content types and HTML routes expose
HTTP `Link` headers for Markdown alternates and `llms.txt`.

| Cloudflare path | Start here |
| --------------- | ---------- |
| Pages with any static output folder | Use the [Cloudflare guide](/platforms/cloudflare/) for Pages setup. |
| Pages with Astro | Use the [Astro guide](/frameworks/astro/) to run OpenNav after `astro build`. |
| Pages with Next.js static export | Use the [Next.js guide](/frameworks/next/) for `output: "export"`. |
| Workers or AI Gateway experiments | Ship the static OpenNav files now, then follow the [server-side roadmap](/frameworks/server-side/) for runtime Markdown responses. |

| Before OpenNav | After OpenNav |
| -------------- | ------------- |
| Agents load visual HTML and guess which content matters. | Agents discover readable entrypoints from `llms.txt` and page links. |
| Agents spend tokens parsing navigation, chrome, scripts, and layout. | Agents read Markdown page mirrors focused on the page content. |
| Tools infer site support from conventions or brittle scraping. | Tools can inspect `/.well-known/opennav.json` for generated artifact paths and compatibility metadata. |
| Content-use preferences live outside the build flow. | Optional `robots.txt` Content Signals guidance can ship with the same deploy. |

## The OpenNav Standard

The first OpenNav profile publishes predictable files and resource links that
let agents discover, read, and respect a site without scraping the visual HTML.

| File or edit | What agents can use it for |
| ------------ | -------------------------- |
| `llms.txt` | Discover the readable site index. |
| `llms-full.txt` | Read combined page content, capped at complete page blocks when needed. |
| `*.md` page artifacts | Read page content without parsing visual HTML. |
| `/.well-known/opennav.json` | Check static compatibility metadata and generated artifact paths. |
| HTML resource links | Discover Markdown mirrors and `llms.txt` from each page. |
| `robots.txt` guidance | Read configured Content Signals preferences when provided. |
| `_headers` | Use Cloudflare Pages response headers when `platform: "cloudflare-pages"` is configured. |

## Pick Your Hook

| Hook | Use it when | Start here |
| ---- | ----------- | ---------- |
| TypeScript SDK | You already know the built output folder. | [SDK Reference](/sdk/) |
| Astro | You want OpenNav to run after `astro build`. | [Astro Guide](/frameworks/astro/) |
| Next.js | You use Next.js static export. | [Next.js Guide](/frameworks/next/) |
| CLI | You want a build-step command. | [CLI Reference](/cli/) |
| Cloudflare | You deploy to Cloudflare Pages, Workers static assets, or are testing AI Gateway agent access. | [Cloudflare Guide](/platforms/cloudflare/) |
| Static site platforms | You deploy a finished folder to Netlify, Vercel static output, GitHub Pages, S3-compatible hosting, or a CDN. | [Static Site Platforms](#static-site-platforms) |
| Server-side Astro and Next.js | You want runtime Markdown content negotiation. Fast-follow open-source track. | [Server-Side Roadmap](/frameworks/server-side/) |

## What OpenNav Does Not Do

OpenNav is not a search engine, a RAG database, or a replacement API. Search can
still find the page; OpenNav gives agents a better way to use the page once they
arrive.

OpenNav does not call an LLM, crawl the public internet, edit your source
project, publish your site, or enforce crawler behavior. Your existing build and
hosting workflow stays in control.

## Static Site Platforms

The static workflow is deployment-platform agnostic. OpenNav reads the generated
HTML, writes agent-readable files beside it, and leaves your hosting stack to
serve the result.

| Path | Supported now | Best fit |
| ---- | ------------- | -------- |
| CLI | Any finished static output folder. | Existing build scripts and CI pipelines. |
| TypeScript SDK | Direct static output folder control. | Custom Node scripts and build hooks. |
| Astro helper | Astro static builds. | `astro build` projects that publish `dist/`. |
| Next.js helper | Next.js static export builds. | `output: "export"` projects that publish `out/`. |

## Server-Side Roadmap

The static profile is the first step toward the broader OpenNav standard:
websites exposing a predictable interface that agents can discover before they
spend tokens reading whole pages.

Server-side Astro and Next.js support is the next open-source track. This is
the future of agent-ready websites: runtime routes that serve HTML to people
and Markdown to agents from the same URL, with site-wide middleware and
per-endpoint controls for apps that cannot export every route first.

See the [server-side roadmap](/frameworks/server-side/) for the planned Astro
and Next.js runtime integrations.
