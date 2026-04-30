---
title: Access Guidance
description: Configure optional Content Signals guidance in robots.txt.
---

`accessGuidance` is optional. If you omit it, OpenNav does not create or edit
`robots.txt` for Content Signals.

Use it when you want the generated static output to include machine-readable
content-use preferences in `robots.txt`.

```typescript
accessGuidance: {
  contentSignals: {
    search: "allow",
    aiInput: "allow",
    aiTrain: "disallow"
  }
}
```

The configured fields become one `Content-signal` directive.

| Field | `allow` writes | `disallow` writes | Meaning |
| ----- | -------------- | ----------------- | ------- |
| `search` | `search=yes` | `search=no` | Whether search indexing and search snippets are allowed. |
| `aiInput` | `ai-input=yes` | `ai-input=no` | Whether real-time AI input use, such as grounding or retrieval, is allowed. |
| `aiTrain` | `ai-train=yes` | `ai-train=no` | Whether model training or fine-tuning use is allowed. |

With the example above, OpenNav writes:

```txt
Content-signal: search=yes, ai-input=yes, ai-train=no
```

OpenNav manages only the block between `# Begin OpenNav AI` and
`# End OpenNav AI`. If `robots.txt` already contains unmanaged Content Signals,
OpenNav returns a warning instead of changing that file.
