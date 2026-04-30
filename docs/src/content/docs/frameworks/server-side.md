---
title: Server-Side Frameworks
description: The open-source future of Astro and Next.js runtime Markdown content negotiation.
---

Server-side Astro and Next.js support is the next open-source track. This is
the future of agent-ready websites: the same route can serve HTML to people and
Markdown to agents through content negotiation.

Static integrations are the launch path today. Server-side integrations will
bring that same OpenNav standard to runtime routes that cannot be exported as a
finished folder of HTML files.

## Planned Support

| Framework | Status | Planned behavior |
| --------- | ------ | ---------------- |
| Astro server output | Fast-follow | Markdown content negotiation for runtime routes. |
| Next.js server output | Fast-follow | Markdown content negotiation for server-rendered routes. |
| Site-wide middleware | Fast-follow | One default Markdown response policy for the whole app. |
| Per-endpoint middleware | Fast-follow | Route-level control for pages that need custom behavior. |

## Content Negotiation

The server-side integrations will let agents request a Markdown representation
of a runtime page while people continue to receive normal HTML. This is designed
for docs, product pages, and app routes that cannot be fully exported as static
HTML during the build.

Responses will include `Vary: Accept` so caches keep browser HTML and
agent-readable Markdown separate.

## Astro Launch Shape

The Astro integration will be able to inject server middleware for selected
runtime routes.

```typescript
import { defineConfig } from "astro/config";
import { OpenNavAstroServer } from "@opennav-ai/opennav/astro";

export default defineConfig({
  output: "server",
  integrations: [
    OpenNavAstroServer({
      siteName: "Example Docs",
      markdown: {
        mode: "content-negotiation",
        routes: ["/docs/**", "/blog/**"],
      },
    }),
  ],
});
```

## Next.js Launch Shape

The Next.js integration will be able to run through a server `proxy.ts`, so
matching stays explicit and agent-readable Markdown can be returned before the
route renders.

```typescript
import { OpenNavNextServer } from "@opennav-ai/opennav/next/server";
import type { NextRequest } from "next/server";

const opennav = OpenNavNextServer({
  siteName: "Example Docs",
  markdown: {
    mode: "content-negotiation",
    routes: ["/docs/:path*", "/blog/:path*"],
  },
});

export function proxy(request: NextRequest) {
  return opennav.handle(request);
}

export const config = {
  matcher: ["/docs/:path*", "/blog/:path*"],
};
```

## Use Static Today

Use the current [Astro guide](/frameworks/astro/) for static Astro builds and
the current [Next.js guide](/frameworks/next/) for Next.js static exports.
