---
title: Next.js
description: Run OpenNav after a supported Next.js static export build.
---

Next.js support is for static export builds.

<p class="opennav-example-label" data-example-role="quick">Quick start</p>

```typescript
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

<p class="opennav-example-label" data-example-role="full">Full example</p>

```typescript
import { OpenNavNext } from "@opennav-ai/opennav/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default OpenNavNext({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  mode: "static",
  outputDirectory: "out",
  accessGuidance: {
    contentSignals: {
      search: "allow",
      aiInput: "allow",
      aiTrain: "disallow",
    },
  },
})(nextConfig);
```

## Options

| Next option | Required | What it means | File outcome |
| ----------- | -------- | ------------- | ------------ |
| `siteName` | Yes | Human-readable site or docs name. | Appears in generated OpenNav files. |
| `siteUrl` | Yes | Public deployed site URL. | Controls generated links and manifest URLs. |
| `mode` | No | Static mode. Defaults to `"static"`. | OpenNav runs only when Next config uses `output: "export"`. |
| `outputDirectory` | No | Static export folder. Defaults to `out`. | OpenNav reads and writes that folder after `next build`. |
| `accessGuidance` | No | Same access policy object used by the SDK. | Only affects `out/robots.txt`, and only when configured. |

## Server-Side Support

Next.js server output is the next open-source track. This is the future of
agent-ready websites: the same route can serve HTML to people and Markdown to
agents through content negotiation.

Planned launch shape:

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

When a request prefers `text/markdown`, OpenNav will return an agent-readable
Markdown representation from the same URL. Browser requests still receive HTML,
and responses include `Vary: Accept` so caches keep both representations
correct.

See the [server-side framework roadmap](/frameworks/server-side/) for the
shared Astro and Next.js launch shape.
