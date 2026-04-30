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

## `OpenNavAstro(options)`

Runs OpenNav after `astro build` finishes writing static output.

```typescript
interface OpenNavAstroOptions {
  readonly siteName: string;
  readonly siteUrl?: string;
  readonly mode?: "static";
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
files, including `dist/llms.txt`, page Markdown files, and
`dist/.well-known/opennav.json`.

### `siteUrl`

Optional when Astro's top-level `site` config is set. Public absolute URL used
for generated links and manifest URLs.

```typescript
export default defineConfig({
  site: "https://example.com",
  integrations: [
    OpenNavAstro({
      siteName: "Example Docs",
    }),
  ],
});
```

Pass `siteUrl` directly when the deployed URL should come from OpenNav instead
of Astro config.

### `mode`

Optional. Only `"static"` is supported today, and OpenNav uses it when `mode` is
omitted.

OpenNav aborts the Astro build with a typed error when Astro reports server
output, because static mode reads and updates the generated `dist` folder.

### `accessGuidance`

Optional. Controls whether OpenNav creates or updates its managed Content
Signals block in `dist/robots.txt`.

When omitted, OpenNav does not create or edit `robots.txt` for access guidance.

### `accessGuidance.contentSignals`

Optional. Content-use preferences OpenNav writes into `dist/robots.txt`.

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
