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

## `OpenNavNext(options)`

Wraps a Next.js config object and runs OpenNav after supported static export
builds.

```typescript
interface OpenNavNextOptions {
  readonly siteName: string;
  readonly siteUrl: string;
  readonly mode?: "static";
  readonly outputDirectory?: string;
  readonly accessGuidance?: {
    readonly contentSignals?: {
      readonly search?: "allow" | "disallow";
      readonly aiInput?: "allow" | "disallow";
      readonly aiTrain?: "allow" | "disallow";
    };
  };
}
```

### `siteName`

Required. Human-readable site or docs name written into generated OpenNav
files, including `out/llms.txt`, page Markdown files, and
`out/.well-known/opennav.json`.

### `siteUrl`

Required. Public absolute URL used for generated links and manifest URLs. The
value should include the protocol and host, such as `https://example.com`.

### `mode`

Optional. Only `"static"` is supported today, and OpenNav uses it when `mode` is
omitted.

OpenNav runs only when the wrapped Next config uses `output: "export"`.

### `outputDirectory`

Optional. Static export folder OpenNav scans and updates after `next build`.
Defaults to `out`.

### `accessGuidance`

Optional. Controls whether OpenNav creates or updates its managed Content
Signals block in `out/robots.txt`.

When omitted, OpenNav does not create or edit `robots.txt` for access guidance.

### `accessGuidance.contentSignals`

Optional. Content-use preferences OpenNav writes into `out/robots.txt`.

At least one nested field must be configured before OpenNav creates or updates
its managed Content Signals block.

<div class="opennav-nested-field-list" aria-label="Content Signals fields">
  <section class="opennav-nested-field">
    <h4><code>search</code></h4>
    <p>
      Optional. Writes <code>search=yes</code> for <code>"allow"</code> or
      <code>search=no</code> for <code>"disallow"</code>. When omitted, OpenNav
      does not express a search-use preference.
    </p>
  </section>

  <section class="opennav-nested-field">
    <h4><code>aiInput</code></h4>
    <p>
      Optional. Writes <code>ai-input=yes</code> for <code>"allow"</code> or
      <code>ai-input=no</code> for <code>"disallow"</code>. When omitted,
      OpenNav does not express an AI-input preference.
    </p>
  </section>

  <section class="opennav-nested-field">
    <h4><code>aiTrain</code></h4>
    <p>
      Optional. Writes <code>ai-train=yes</code> for <code>"allow"</code> or
      <code>ai-train=no</code> for <code>"disallow"</code>. When omitted,
      OpenNav does not express an AI-training preference.
    </p>
  </section>
</div>

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
