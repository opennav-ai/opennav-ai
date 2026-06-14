---
title: Server-Side Frameworks
description: Runtime Markdown content negotiation for Astro, Next.js, Hono, Cloudflare Workers, and any WinterCG-compatible server.
---

OpenNav's `OpenNavServer` gives every server-rendered page a Markdown
representation through standard HTTP content negotiation. When a client sends
`Accept: text/markdown`, the server converts the HTML response to clean Markdown
on-the-fly. Browser requests still receive normal HTML. Both responses include
`Vary: Accept` so caches keep the two representations separate.

## Quick Start

```ts
import { OpenNavServer } from "@opennav-ai/opennav/server";

const opennav = new OpenNavServer();

app.get("/docs/:slug", async (c) => {
  const htmlResponse = await renderPage(c.req.param("slug"));
  const result = await opennav.negotiate({
    request: c.req.raw,
    htmlResponse,
  });
  if (result.isErr()) return c.text("Internal error", 500);
  return result.value;
});
```

`OpenNavServer` works with standard `Request` / `Response` objects, so it fits
any WinterCG-compatible runtime: Hono, Astro, Next.js, Cloudflare Workers, Bun,
SvelteKit, and more.

## What Happens Per Request
| Client Accept header | Response |
| -------------------- | -------- |
| Prefers `text/markdown` | HTML body is converted to Markdown. `Content-Type: text/markdown; charset=utf-8`. |
| Prefers `text/html` | Original HTML passes through unchanged. A `Link: </path>; rel="alternate"; type="text/markdown"` header is added so agents can discover the Markdown representation. |
| No matching type (406) | `406 Not Acceptable` with `Content-Type: text/plain; charset=utf-8`. |

All three response paths include `Vary: Accept`.

## Framework Examples

### Hono

```ts
import { OpenNavServer } from "@opennav-ai/opennav/server";

const opennav = new OpenNavServer();

app.get("/docs/:slug", async (c) => {
  const htmlResponse = await renderPage(c.req.param("slug"));
  const result = await opennav.negotiate({
    request: c.req.raw,
    htmlResponse,
  });
  if (result.isErr()) return c.text("Internal error", 500);
  return result.value;
});
```

### Astro (SSR)

```ts
import { OpenNavServer } from "@opennav-ai/opennav/server";

const opennav = new OpenNavServer();

export const GET: APIRoute = async (ctx) => {
  const htmlResponse = await ctx.render();
  const result = await opennav.negotiate({
    request: ctx.request,
    htmlResponse,
  });
  if (result.isErr()) return new Response(null, { status: 500 });
  return result.value;
};
```

### Next.js

```ts
import { OpenNavServer } from "@opennav-ai/opennav/server";

const opennav = new OpenNavServer();

export async function GET(req: Request) {
  const htmlResponse = await fetchPageHtml(req.url);
  const result = await opennav.negotiate({
    request: req,
    htmlResponse,
  });
  if (result.isErr()) return new Response(null, { status: 500 });
  return result.value;
}
```

### Cloudflare Workers

```ts
import { OpenNavServer } from "@opennav-ai/opennav/server";

const opennav = new OpenNavServer();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/docs/")) {
      const htmlResponse = await env.ASSETS.fetch(request);
      const result = await opennav.negotiate({
        request,
        htmlResponse,
      });
      if (result.isOk()) return result.value;
    }

    return env.ASSETS.fetch(request);
  },
};
```

### Cloudflare Pages Functions

```ts
import { OpenNavServer } from "@opennav-ai/opennav/server";

const opennav = new OpenNavServer();

export async function onRequest(context) {
  if (context.request.url.includes("/docs/")) {
    const htmlResponse = await context.next();
    const result = await opennav.negotiate({
      request: context.request,
      htmlResponse,
    });
    if (result.isOk()) return result.value;
  }
  return context.next();
}
```

## Cloudflare Workers and Pages: Avoid Wasted CPU

Cloudflare's **default routing behavior** is efficient: if a request matches a
static file on disk, that file is served directly without invoking your Worker
code. Your Worker only runs for requests that don't match a static asset (or
when you explicitly use `run_worker_first`).

**Recommendation:** Keep the default routing when you have static assets.
Deploy your OpenNav-generated Markdown files (`*.md`, `llms.txt`,
`llms-full.txt`) alongside your static HTML. Cloudflare will serve the `.md`
files directly from disk — zero CPU, zero Worker invocation — when agents
request them by path.

If you instead route every request through `OpenNavServer`, you pay for Worker
CPU on every agent request to convert HTML back into the same Markdown you
already generated at build time. That is wasted cost.

### When to use OpenNavServer on Cloudflare

Use `OpenNavServer` on Cloudflare when:

- Your pages are **fully SSR** (no static HTML or Markdown exists on disk).
- You have **dynamic or personalized content** that can't be pre-generated.
- You want Markdown for paths that don't exist as static `.md` files.

If your Markdown files are already on disk, let Cloudflare serve them directly.
If a page has no `.md` sibling, Cloudflare's own [Markdown for
Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)
feature can convert HTML to Markdown at the edge with zero application code (Pro
plan and above).

### Cloudflare's Built-In Markdown for Agents

Cloudflare offers a native [Markdown for
Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)
feature that converts HTML to Markdown at the edge with no application code
required. When enabled for your zone, Cloudflare automatically handles
`Accept: text/markdown` requests by fetching your origin HTML, converting it to
Markdown, and returning it.

| Approach | Best for |
| -------- | -------- |
| Static `.md` files on disk | Pre-generated pages. Zero CPU, zero cost. Deploy OpenNav's build output. |
| Cloudflare Markdown for Agents | Any origin HTML. Zero application code. Requires Pro or Business plan. |
| `OpenNavServer` in a Worker | Full control over conversion, custom stripping rules, or platforms without Cloudflare's native feature. |

### Static `.md` first, runtime fallback

If you use `run_worker_first` (for example, you have API routes alongside docs
pages), Cloudflare's default routing can't help — every request invokes your
Worker. But you can still avoid wasted CPU by checking for a static `.md` file
first:

```ts
import { AcceptHeaderNegotiator, OpenNavServer } from "@opennav-ai/opennav/server";

const opennav = new OpenNavServer();
const acceptNegotiator = new AcceptHeaderNegotiator();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Negotiate first to get the decision without converting anything.
    const decision = acceptNegotiator.negotiate({
      acceptHeader: request.headers.get("accept") ?? null,
      produces: ["text/html", "text/markdown"],
    });

    // HTML (or no Accept header) — pass through with Vary + Link.
    if (decision === "text/html" || decision === null) {
      const htmlResponse = await env.ASSETS.fetch(request);
      const result = await opennav.negotiate({ request, htmlResponse });
      if (result.isErr()) return new Response("Internal error", { status: 500 });
      return result.value;
    }

    // Markdown — try static .md first to avoid conversion cost.
    // /docs/foo → /docs/foo.md, /docs/foo/ → /docs/foo.md, /docs/foo.html → /docs/foo.md
    const mdPath = url.pathname
      .replace(/\/$/, "")
      .replace(/\.html$/, "") + ".md";

    const staticMd = await env.ASSETS.fetch(
      new Request(new URL(mdPath, request.url), request),
    );

    if (staticMd.ok) {
      const headers = new Headers(staticMd.headers);
      headers.set("Vary", "Accept");
      headers.set("Content-Type", "text/markdown; charset=utf-8");
      return new Response(staticMd.body, {
        status: staticMd.status,
        statusText: staticMd.statusText,
        headers,
      });
    }

    // No static .md — convert HTML to Markdown on-the-fly.
    const htmlResponse = await env.ASSETS.fetch(request);
    if (!htmlResponse.ok) return htmlResponse;

    const result = await opennav.negotiate({ request, htmlResponse });
    if (result.isErr()) return new Response("Internal error", { status: 500 });
    return result.value;
  },
};
```

Here's what happens per request:

1. **No Accept header or prefers HTML** → `OpenNavServer.negotiate()` returns the
   HTML with `Vary: Accept` and `Link: rel="alternate"`.
2. **Prefers Markdown, `.md` exists on disk** → served directly from the static
   asset store with `Vary: Accept`. Zero conversion cost.
3. **Prefers Markdown, no `.md` on disk** → `OpenNavServer.negotiate()` converts
   HTML to Markdown on-the-fly.
4. **Unsupported type** → `OpenNavServer.negotiate()` returns `406 Not
   Acceptable` with `Vary: Accept`.

This pattern works for both [Workers static
assets](https://developers.cloudflare.com/workers/static-assets/#routing-behavior)
and [Pages
Functions](https://developers.cloudflare.com/pages/functions/api-reference/#envassetsfetch).
If your site is fully static (no `run_worker_first`), you don't need any of this
— Cloudflare serves `.md` files directly with zero Worker invocation.

## Configuration

```ts
interface OpenNavServerOptions {
  /** Content types the server can produce, in priority order.
   *  Defaults to ["text/html", "text/markdown"]. */
  produces?: readonly string[];

  /** Optional layout stripping before Markdown conversion. */
  contentExtraction?: OpenNavContentExtractionOptions;
}
```

## Out of Scope

The `OpenNavServer` does one thing: per-request HTML-to-Markdown content
negotiation. It does not:

- Rewrite internal links to `.md` endpoints.
- Cache converted Markdown (wrap in your own CDN/cache headers).
- Generate `llms.txt` or `llms-full.txt` at runtime (those are build-time artifacts).
- Auto-discover pages or slugs (page metadata is derived from the request URL).

For static builds, continue using the [Astro](/frameworks/astro/) or
[Next.js](/frameworks/next/) guides.
