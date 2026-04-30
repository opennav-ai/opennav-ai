---
title: SDK
description: Use OpenNavStaticSite from a Node script or framework hook.
---

Use the root SDK when your script already knows the built output folder.

## Install

Install OpenNav before importing `OpenNavStaticSite`.

```bash
npm install @opennav-ai/opennav
```

<p class="opennav-example-label" data-example-role="quick">Quick start</p>

```typescript
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

<p class="opennav-example-label" data-example-role="full">Full example</p>

```typescript
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

if (result.isErr()) {
  console.error(result.error.message);
  process.exit(1);
}

console.log(result.value);
```

## `OpenNavStaticSite(options)`

Creates a static-site runner for one built output folder.

```typescript
interface OpenNavStaticSiteOptions {
  readonly siteName: string;
  readonly siteUrl: string;
  readonly outputDirectory: string;
  readonly preset?: "astro" | "next-export";
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
files, including `llms.txt`, page Markdown files, and
`.well-known/opennav.json` inside `outputDirectory`.

### `siteUrl`

Required. Public absolute URL used for generated links and manifest URLs. The
value should include the protocol and host, such as `https://example.com`.

### `outputDirectory`

Required. Built static output folder OpenNav scans and updates.

OpenNav reads from and writes to this folder only. Relative paths are resolved
by the calling script from the current project root.

### `preset`

Optional. Framework hint for static-folder conventions.

Supported values are `"astro"` and `"next-export"`. When omitted, OpenNav
treats `outputDirectory` as a generic static site folder.

### `accessGuidance`

Optional. Controls whether OpenNav creates or updates its managed Content
Signals block in `robots.txt` inside `outputDirectory`.

When omitted, OpenNav does not create or edit `robots.txt` for access guidance.

### `accessGuidance.contentSignals`

Optional. Content-use preferences OpenNav writes into `robots.txt`.

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

## `build(options)`

Runs OpenNav against the configured output folder.

```typescript
interface OpenNavStaticSiteBuildOptions {
  readonly dryRun?: boolean;
}
```

### `dryRun`

Optional. Set to `true` to preview created, modified, skipped, and warning paths
without changing files.
