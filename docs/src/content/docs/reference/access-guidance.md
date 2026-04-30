---
title: Access Guidance
description: Configure optional Content Signals guidance in robots.txt.
---

`accessGuidance` is optional. If you omit it, OpenNav does not create or edit
`robots.txt` for Content Signals.

Use it when you want the generated static output to include machine-readable
content-use preferences in `robots.txt`. Content Signals are a convention for
expressing preferences about how crawlers use content after they access it; see
[Content Signals](https://contentsignals.org/) for the policy text and
generator.

## When to use it

Configure access guidance when you want to publish an explicit preference for
search indexing, real-time AI input use, or AI training while keeping the site
publicly crawlable.

This is a good fit for docs, blogs, marketing sites, and public reference
content where you want normal discovery to keep working, but you still want
`robots.txt` to state how automated systems should use the content.

## When to omit it

Omit `accessGuidance` when you do not want OpenNav to manage any part of
`robots.txt`, when your team already owns a hand-written Content Signals policy,
or when you have not decided what preferences to publish.

Content Signals are not a technical block against scraping. They express site
owner preferences, and some crawlers may ignore them. Use crawler controls,
WAF rules, bot management, authentication, or paywalling when you need
enforcement instead of preference signaling.

```typescript
interface OpenNavAccessGuidanceOptions {
  readonly contentSignals?: {
    readonly search?: "allow" | "disallow";
    readonly aiInput?: "allow" | "disallow";
    readonly aiTrain?: "allow" | "disallow";
  };
}
```

## `contentSignals`

Optional. Content-use preferences OpenNav writes into `robots.txt`.

The configured fields become one `Content-signal` directive.

<div class="opennav-nested-field-list" aria-label="Content Signals fields">
  <section class="opennav-nested-field">
    <h4><code>search</code></h4>
    <p>
      Writes <code>search=yes</code> for <code>"allow"</code> or
      <code>search=no</code> for <code>"disallow"</code>. Use this field for
      search indexing and search snippets.
    </p>
  </section>

  <section class="opennav-nested-field">
    <h4><code>aiInput</code></h4>
    <p>
      Writes <code>ai-input=yes</code> for <code>"allow"</code> or
      <code>ai-input=no</code> for <code>"disallow"</code>. Use this field for
      real-time AI input use, such as grounding or retrieval.
    </p>
  </section>

  <section class="opennav-nested-field">
    <h4><code>aiTrain</code></h4>
    <p>
      Writes <code>ai-train=yes</code> for <code>"allow"</code> or
      <code>ai-train=no</code> for <code>"disallow"</code>. Use this field for
      model training or fine-tuning use.
    </p>
  </section>
</div>

Example configuration:

```typescript
accessGuidance: {
  contentSignals: {
    search: "allow",
    aiInput: "allow",
    aiTrain: "disallow"
  }
}
```

With the example above, OpenNav writes:

```txt
Content-signal: search=yes, ai-input=yes, ai-train=no
```

OpenNav manages only the block between `# Begin OpenNav AI` and
`# End OpenNav AI`. If `robots.txt` already contains unmanaged Content Signals,
OpenNav returns a warning instead of changing that file.
