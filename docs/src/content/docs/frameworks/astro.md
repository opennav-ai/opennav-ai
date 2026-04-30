---
title: Astro
description: Run OpenNav after an Astro static build.
---

Astro static sites can run OpenNav after `astro build` through the Astro
integration.

<p class="opennav-example-label" data-example-role="quick">Quick start</p>

```typescript
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

<p class="opennav-example-label" data-example-role="full">Full example</p>

```typescript
import { defineConfig } from "astro/config";
import { OpenNavAstro } from "@opennav-ai/opennav/astro";

export default defineConfig({
  site: "https://example.com",
  integrations: [
    OpenNavAstro({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
      mode: "static",
      accessGuidance: {
        contentSignals: {
          search: "allow",
          aiInput: "allow",
          aiTrain: "disallow",
        },
      },
    }),
  ],
});
```

If `siteUrl` is omitted, the integration uses Astro's top-level `site` value.
Static mode is the supported Astro integration mode and is used when `mode` is
omitted.

## Options

| Astro option | Required | What it means | File outcome |
| ------------ | -------- | ------------- | ------------ |
| `siteName` | Yes | Human-readable site or docs name. | Appears in generated OpenNav files. |
| `siteUrl` | No when Astro `site` is set | Public deployed site URL. | Controls generated links and manifest URLs. |
| `mode` | No | Static mode. Defaults to `"static"`. | OpenNav runs only for Astro static output. |
| `accessGuidance` | No | Same access policy object used by the SDK. | Only affects `dist/robots.txt`, and only when configured. |

## Server-Side Support

Astro server output is the next open-source track. This is the future of
agent-ready websites: the same route can serve HTML to people and Markdown to
agents through content negotiation.

Planned launch shape:

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

When a request prefers `text/markdown`, OpenNav will return an agent-readable
Markdown representation from the same URL. Browser requests still receive HTML,
and responses include `Vary: Accept` so caches keep both representations
correct.

See the [server-side framework roadmap](/frameworks/server-side/) for the
shared Astro and Next.js launch shape.
