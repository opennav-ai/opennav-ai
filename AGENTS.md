# AGENTS.md — Working Rules & Boundaries

> These rules apply to all AI agents working in this codebase. Follow them without exception.

---

## Architecture Principles

- **Behavior first** — start from the user-visible command, file change, or output the system must support before naming classes, interfaces, or config.
- **Configurable variation** — URLs, chunking rules, model names, and site-specific behavior must be supplied through typed config or concrete strategy classes. Do not hardcode values that should change between sites, models, or runs.
- **Closed for modification, open for extension** — core logic should support new sites, models, or output formats through new implementations behind existing interfaces, not by rewriting existing behavior.
- **Class-oriented OO** — use classes to separate concerns. Classes are easier to unit test, easier to understand, and enforce clear boundaries. No loose functions floating in modules.
- **Interfaces drive everything** — once the behavior is agreed, define interfaces for input signatures, return types, and component boundaries before filling in business logic.
- **Local first** — the system must run entirely on a single machine with no external service dependencies. Use local filesystem and in-memory implementations before introducing infrastructure.

---

## Communication

- **Concrete first** — explain product behavior in plain, specific terms before naming abstractions. Say what the user can do and what files or outputs change before talking about contracts, services, interfaces, or package ownership.
- **No abstraction soup** — avoid vague summaries like "resources, signals, guidance, reports" unless each word is immediately tied to concrete files, commands, inputs, or outputs. Prefer examples such as `dist/index.html`, `dist/llms.txt`, `/.well-known/opennav.json`, `robots.txt`, and the exact CLI command or file edit being discussed.
- **Functionality before types** — when discussing slices, start with the smallest user-visible capability and only then describe the supporting classes or types.
- **Translate technical terms** — if a term like "source discovery", "artifact planning", or "page metadata normalization" is useful, immediately anchor it to the concrete action it means in this product.

---

## Code Style

- **`any` is banned** — every type must be explicitly typed. No `any`, no implicit `any`, no `as any`. Use `unknown` if the type is genuinely unknown, then narrow it.
- **Use `neverthrow` for failures** — use the [`neverthrow`](https://github.com/supermacro/neverthrow) package and return `Result<T, E>` for all operations that can fail. New public engine APIs must expose failure through `Result<T, OpenNavError>` or a more specific typed error. Do not throw errors for expected failure paths, and do not use `try/catch` for control flow.
- **All functions and methods must have explicit input and return types** — no relying on TypeScript inference for public APIs. Every function signature must declare its parameter types and return type.
- **Small functions, small methods** — each function does one thing. If a method is doing two things, split it.
- **TSDoc on all public methods** — every public class method and exported function gets a TSDoc comment describing what it does, its parameters, and its return value.
- **TSDoc on all exported type fields** — every field on an exported interface or type gets a TSDoc comment. The comment must explain the concrete product meaning of the field, when it is populated, and any important units or path rules. Do not restate the property name in prose; explain behavior. For example, document whether a path is relative to `outputDirectory`, whether it describes a newly created file or an existing file whose contents changed, and whether details are also available in `warnings`.
- **One type per file** — types are grouped by concept in their own file (e.g., `types/section.ts`, `types/grep.ts`), not lumped into a single `types.ts`.
- **Subdirectory organization** — within each package, use `src/services/`, `src/stores/`, `src/types/` etc. to organize by role. No flat file dumps in `src/`.
- **No barrel file abuse** — keep `index.ts` re-exports minimal and intentional. Published packages, CLI code, and engine code must stay in their own package boundaries.
- **Name result fields by concrete file behavior** — use names such as `createdFilePaths`, `modifiedFilePaths`, and `skippedFilePaths`. Avoid ambiguous names such as `changedFilePaths` when the path itself is not renamed or moved.
- **Keep fatal failures out of success payloads** — expected fatal failures should return `err(OpenNavError)` from the operation. Do not add `failures: []` to a successful result unless a later reporting layer has a concrete need to preserve fatal errors inside a report object.
- **Observable by design** — significant operations should expose structured diagnostics, warnings, logs, or validation output with useful context. Core engine code should return structured warnings instead of printing to stdout or stderr; the CLI can decide later whether to show those warnings normally, hide them, or print them behind a verbose flag. Do not add logging abstractions before a concrete class needs them.

---

## Development Workflow

### Building New Features

1. **Discuss architecture first** — before writing any code, discuss class structure, dependencies, and naming. Agree on the shape before touching files.
2. **Interfaces + empty stubs with TSDoc** — implement the agreed interfaces as empty/stub methods with full TSDoc. Focus on the signatures, not the bodies.
3. **Review together** — do not fill in function bodies until we've agreed the signatures and structure are correct.
4. **Build inside-out** — implement leaf classes first (no dependencies), with unit tests for each. Red → green → refactor at each layer.
5. **Integration test last** — once leaf implementations are green, write an integration test that wires everything together and validates the end-to-end flow.

### Rules

- **Do not make multi-file changes unprompted** — when building a new feature, do not run ahead and modify multiple files. Start with the interface, stub it out, and wait.
- **Stay on task** — only modify code directly related to the current task. Do not refactor, "improve", or touch surrounding code.
- **Small diffs** — make the smallest reasonable change. One method, one test, verify, move on.
- **No new dependencies without discussion** — do not add npm packages without asking first.
- **No commits without permission** — never run `git commit` or `git push` unless explicitly asked.
- **Typed commit prefixes** — when committing, prefix every commit message with a concrete type such as `fix:`, `feat:`, `refactor:`, `chore:`, `docs:`, or `test:`. Use the type that best describes the user-visible purpose of the commit. Optional scopes are allowed, for example `fix(engine): handle missing output directory`.
- **Behaviour-focused commit descriptions** — include a bullet-pointed commit body that explains the behaviour changed or added, not a list of files edited. Describe what the user or calling code can now do, what failure mode changed, and what existing behaviour is preserved.

Example:

```text
fix(engine): reject missing output directory

- `Engine.execute(...)` now returns a typed error when the configured output directory does not exist.
- The CLI can show a clear abort message instead of continuing with a partial write plan.
- Valid output directories still produce the same generated files.
```

---

## CLI Safety

- **Explicit over implicit** — CLI commands must require explicit flags for any operation that does real work (API calls, LLM calls, database writes).
- **Abort by default** — if a required flag is missing, abort with a clear error message explaining what flag to pass. Never silently proceed with defaults on destructive or expensive operations.
- **`--full-run` required for bulk operations** — ingesting all URLs, wiping the database, or any operation that touches more than a handful of records must require an explicit flag.
- **Dry-run friendly** — where possible, support `--dry-run` to preview what would happen without executing.

---

## Testing

- **Co-located tests** — unit test files live next to the logic file they test. `engine.ts` → `engine.test.ts`. No separate `__tests__/` or `tests/` directories.
- **Test every method** — every public method gets at least one test when its implementation is filled in.
- **Scale test code to risk** — keep the amount of test code proportional to the value and risk of the change. For small targeted behavior changes, prefer adding one focused assertion to existing real coverage over creating new harnesses, mocks, or test files. Add larger scaffolding only when it catches a concrete risk that existing tests cannot cover.
- **Test runner** — vitest (zero config, native TypeScript, fast).
- **Quiet by default** — run tests with `npm test` (quiet/minimal output). Use `npm run test:verbose` only when debugging failures.
- **Assert on exact values, not counts** — never assert that a result "has length > 0" or "contains" a value in isolation. Assert the full response structure and values with `toEqual`. Tests must verify actual behaviour and output, not just that _something_ was returned.
- **No indexing into results** — do not use `results[0]`, `results[1]`, etc. to spot-check individual items. Assert the entire array with `toEqual` so the test fails if any element is wrong, missing, or unexpected.
- **Banned assertion patterns** — the following are explicitly banned: `.toBeGreaterThan(0)`, `.toBeGreaterThanOrEqual(N)`, `.toHaveLength(N)` without a corresponding `toEqual` for the full structure, `.toContain()` as the sole assertion on a collection. If you know the expected output, assert it exactly.
- **Real over mocks** — prefer real implementations wherever possible. Use real SQLite (in-memory), real path trees, real classes. Do not mock what you can instantiate.
- **MSW for HTTP** — when HTTP calls must be intercepted (external APIs like Firecrawl, LLM providers), use [MSW](https://mswjs.io/) (Mock Service Worker). No `jest.mock()`, no manual fetch stubs.

---

## Linting & Formatting

- **Fast feedback** — `npm run lint:fix` to auto lint fix and format bix

---

## Package Structure

This repository is the OpenNav AI npm workspace. The root package is private and uses `packages/*` as the workspace package pattern. Do not use the old prototype `modules/*` layout here.

```
assets/       # shared repository assets
docs/         # Astro documentation site for OpenNav AI
examples/     # framework fixtures and example projects used by example tests
packages/
  engine/    # @opennav-ai/engine — private workspace package for static site generation, validation, and AI Interface contracts
  opennav/   # @opennav-ai/opennav — published package with SDK exports, framework helpers, and the `opennav` / `opennav-ai` binaries
scripts/      # repository checks and fixture runners
```

Package rules:

- `@opennav-ai/engine` is the shared private workspace package for engine behavior and contracts. It is not published separately.
- `@opennav-ai/opennav` is the package users install. It exposes the SDK entrypoint, `./astro`, `./next`, and the `opennav` / `opennav-ai` CLI binaries.
- The engine exposes one public behavior entrypoint: `Engine.execute(...)`. Lower-level classes such as file kind detectors, file readers, validators, write planners, generators, and reporters are internal engine implementation details unless a public API change is explicitly discussed and agreed.
- Shared engine contracts live inside `packages/engine/src/common/` for now. Do not create a separate `@opennav-ai/common` package unless the public API need is discussed and agreed.

Each package is independent. No circular dependencies.

- **Cross-package imports** — use TypeScript project references and npm workspace symlinks. `packages/opennav` imports the private engine through the `#opennav-engine` package import alias, which points at `packages/engine/src/index.ts` during development and at the bundled engine output in the published package. No manual relative imports across package boundaries.

---
