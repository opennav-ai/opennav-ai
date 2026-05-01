# Package Maintainer Guide

This guide is for maintainers of this repository. It is not user-facing product
documentation.

The current Phase 1 packaging goal is simple: publish one consumer package,
`@opennav-ai/opennav`, that works from ESM, CommonJS, framework integrations,
and the CLI without requiring consumers to install `@opennav-ai/engine`.

## Current Package Shape

The workspace has two packages:

```text
packages/
  engine/    private internal engine source and engine package smoke checks
  opennav/   public package published as @opennav-ai/opennav
```

`@opennav-ai/engine` is private. It remains useful as a workspace boundary and
as a focused place for engine tests, but it is not published for Day 1 release.

`@opennav-ai/opennav` is the public package. It owns:

- The root SDK export: `@opennav-ai/opennav`
- The Astro export: `@opennav-ai/opennav/astro`
- The Next export: `@opennav-ai/opennav/next`
- The CLI bins: `opennav` and `opennav-ai`
- The public `OpenNav*` option, result, and error types
- The compiled engine implementation used at runtime

## How The OpenNav Build Uses Engine Code

OpenNav source imports the engine through a private package import:

```ts
import { Engine } from "#opennav-engine";
```

During development and build, `packages/opennav/tsconfig.json` maps that alias to
the engine source:

```json
{
  "compilerOptions": {
    "paths": {
      "#opennav-engine": ["../engine/src/index.ts"]
    }
  }
}
```

`packages/opennav/tsconfig.build.json` sets `rootDir` to `..`, so `zshy` compiles
the reachable OpenNav and engine source files into one OpenNav `dist/` tree:

```text
packages/opennav/dist/
  opennav/src/index.js
  opennav/src/astro.js
  opennav/src/next.js
  opennav/src/cli.cjs
  engine/src/index.js
  engine/src/engine.js
```

The built package keeps the private import specifier in emitted OpenNav files:

```js
import { Engine } from "#opennav-engine";
```

`packages/opennav/package.json#imports` resolves that private specifier inside
the installed package:

```json
{
  "imports": {
    "#opennav-engine": {
      "types": "./dist/engine/src/index.d.cts",
      "import": "./dist/engine/src/index.js",
      "require": "./dist/engine/src/index.cjs"
    }
  }
}
```

There is no post-build copy step and no rewrite script. The normal OpenNav build
compiles the real engine source through TypeScript path resolution.

## Public Export Contract

The public package exports only the user-facing entrypoints:

```json
{
  "exports": {
    ".": {
      "types": "./dist/opennav/src/index.d.cts",
      "import": "./dist/opennav/src/index.js",
      "require": "./dist/opennav/src/index.cjs"
    },
    "./astro": {
      "types": "./dist/opennav/src/astro.d.cts",
      "import": "./dist/opennav/src/astro.js",
      "require": "./dist/opennav/src/astro.cjs"
    },
    "./next": {
      "types": "./dist/opennav/src/next.d.cts",
      "import": "./dist/opennav/src/next.js",
      "require": "./dist/opennav/src/next.cjs"
    }
  }
}
```

Do not add public exports for engine internals unless we deliberately decide to
publish that API. The internal engine index currently exports only `Engine`.

## Dependency Rules

`packages/opennav/package.json` must list every runtime dependency needed by the
OpenNav package and by the compiled engine code. That includes engine runtime
dependencies such as `js-tiktoken`, `parse5`, `turndown`, and
`turndown-plugin-gfm`.

`@opennav-ai/opennav` must not depend on `@opennav-ai/engine`. Consumers should
install one package:

```bash
npm install -D @opennav-ai/opennav
```

The example harness verifies this by installing only the packed OpenNav tarball
and asserting `node_modules/@opennav-ai/engine` is absent.

## Root NPM Scripts

Run these from the repository root.

| Command | What It Does | When To Use It |
| --- | --- | --- |
| `npm run build` | Runs `npm run build --workspaces`, building engine and OpenNav packages. | Normal build verification. |
| `npm test` | Runs the root Vitest suite for `packages/**/*.test.ts`. | Normal source test verification. |
| `npm run test:verbose` | Runs the same root Vitest suite with verbose reporting. | Debugging failing tests. |
| `npm run lint` | Runs `biome check .`. | Required before publishing or committing broad changes. |
| `npm run check` | Runs `biome check --write .`. | Applies Biome safe fixes and checks. |
| `npm run format` | Runs `biome format --write .`. | Applies formatting only. |
| `npm run lint:fix` | Runs `npm run check && npm run format`. | Full local Biome fix pass. |
| `npm run test:examples` | Runs the full packed-package example matrix. | Required packaging compatibility check. |
| `npm run test:examples:vitest` | Direct Vitest command behind `test:examples`. | Useful when debugging the example config. |
| `npm run test:frameworks` | Alias for `npm run test:examples`. | Backward-compatible framework test command. |
| `npm run test:package:engine` | Runs the engine packed-package type smoke test. | Checks the private engine package shape still builds. |
| `npm run fixture:engine:phase1:write` | Runs the manual Phase 1 fixture writer with Bun. | Manual inspection of engine output files. |

The root `npm test` command is the supported source-test entrypoint today. The
package-level `test` scripts exist, but the current Vitest include pattern is
root-oriented.

## Package NPM Scripts

Run package scripts through npm workspaces from the repository root.

### Public OpenNav Package

```bash
npm run build --workspace @opennav-ai/opennav
npm run pack:check --workspace @opennav-ai/opennav
npm run test:package --workspace @opennav-ai/opennav
npm pack --dry-run --workspace @opennav-ai/opennav
```

What they do:

- `build` runs `zshy --project tsconfig.build.json`, compiling OpenNav and the
  reachable engine source into `packages/opennav/dist/`.
- `pack:check` runs `npm pack --dry-run --cache ../../.npm-cache` from the
  package directory.
- `test:package` builds OpenNav, packs it, extracts the tarball into temporary
  consumers, and verifies ESM types, ESM runtime imports, and CommonJS runtime
  requires.
- `npm pack --dry-run --workspace @opennav-ai/opennav` is the direct npm pack
  check used before publishing.

### Private Engine Package

```bash
npm run build --workspace @opennav-ai/engine
npm run pack:check --workspace @opennav-ai/engine
npm run test:package --workspace @opennav-ai/engine
npm run test:package:engine
```

What they do:

- `build` runs `zshy --project tsconfig.build.json`, compiling the engine package
  to `packages/engine/dist/`.
- `pack:check` runs `npm pack --dry-run --cache ../../.npm-cache` from the
  package directory.
- `test:package` builds the engine, packs it, extracts the tarball into
  temporary TypeScript consumers, and verifies ESM and CommonJS type consumers.
- `npm run test:package:engine` is the root alias for the same engine package
  smoke test.

The engine package remains private even though these checks exist. Keep the
checks because they protect the internal package boundary and catch accidental
export or build regressions.

## Package Smoke Test Scripts

The package smoke checks live in `scripts/`.

`scripts/check-opennav-package-exports.mjs`:

- Runs `npm pack --json` for `packages/opennav`.
- Extracts the packed tarball into a temporary install shape.
- Copies only `@opennav-ai/opennav` into temporary consumers.
- Symlinks runtime dependencies from root `node_modules`.
- Runs a TypeScript ESM consumer against public types.
- Runs an ESM runtime consumer.
- Runs a CommonJS runtime consumer.
- Does not install or copy `@opennav-ai/engine`.

`scripts/check-engine-package-types.mjs`:

- Runs `npm pack --json` for `packages/engine`.
- Extracts the packed tarball into a temporary install shape.
- Runs TypeScript ESM and CommonJS consumers against the private engine package.
- Imports only `Engine` from the engine package index.

`scripts/run-phase-1-fixture.ts`:

- Copies the Phase 1 static fixture into a manual-run directory.
- Runs `Engine.execute(...)` with `dryRun: false`.
- Writes `build-result.json` next to the generated output.
- Imports internal engine types directly from engine source files because the
  engine package index intentionally exports only `Engine`.

## Example Compatibility Matrix

`npm run test:examples` is the strongest packaging compatibility check. It:

- Builds and packs `@opennav-ai/opennav`.
- Installs only the packed OpenNav tarball into each example.
- Verifies the install is not a workspace symlink.
- Verifies `node_modules/@opennav-ai/engine` is absent.
- Builds the example framework/static output.
- Runs OpenNav through the public integration point.
- Snapshots the final generated output tree.

Current examples cover:

- Astro 6 static
- Astro 5 static
- Astro 4 static
- Next 16 static export
- Next 15 static export
- Next 14 static export
- CLI build script
- Static-site SDK

When OpenNav package dependencies change, refresh the example lockfiles so the
packed examples still model real consumer installs.

## Release Pipeline Improvements To Track

The examples check is strong enough to act as a release gate, but the current
release scripts do not enforce it yet. `publish:opennav:dry-run` and
`publish:opennav` currently run `test:package:opennav`; they do not run
`npm run test:examples`. Until the scripts are updated, maintainers must run the
example matrix manually before publishing.

The current example matrix is also explicit. Astro, Next, CLI, and static SDK
examples are listed in the Vitest files under `examples/tests/`. If a new
`examples/*/package.json` project is added, add matching test coverage at the
same time. A future meta-test should compare the example folders on disk with
the configured matrix so new examples cannot silently drift outside the release
check.

## Standard Verification Before Publishing

Run this full set before publishing `@opennav-ai/opennav`:

```bash
npm run build
npm run lint
npm test
npm run test:package --workspace @opennav-ai/opennav
npm run test:package --workspace @opennav-ai/engine
npm pack --dry-run --workspace @opennav-ai/opennav
npm run test:examples
```

Expected shape:

- `packages/opennav/dist/opennav/src/*` contains public OpenNav entrypoints.
- `packages/opennav/dist/engine/src/*` contains compiled internal engine files.
- Packed OpenNav includes `dist/` and `package.json`.
- Packed OpenNav does not require a separate `@opennav-ai/engine` install.
- Public imports work from ESM and CommonJS.
- The CLI bin resolves to `dist/opennav/src/cli.cjs`.

## Adding Or Changing Public Entrypoints

For a new public OpenNav subpath:

1. Add the source entrypoint under `packages/opennav/src/`.
2. Add the subpath to `packages/opennav/package.json#zshy.exports`.
3. Run `npm run build --workspace @opennav-ai/opennav` so `zshy` updates
   `exports`.
4. Add package smoke-test coverage in `scripts/check-opennav-package-exports.mjs`.
5. Add example coverage when the entrypoint represents a real user workflow.
6. Run the standard publishing verification set.

For an internal engine change:

1. Keep implementation imports inside `packages/engine/src/`.
2. Export only `Engine` from `packages/engine/src/index.ts`.
3. Add public OpenNav wrapper types in `packages/opennav/src/types/` when a type
   crosses the package boundary.
4. Keep `packages/opennav/src/index.ts` returning `OpenNav*` public types rather
   than engine-branded types.
5. Run the package and example smoke checks.

## Things To Avoid

- Do not add a post-build copy or import-rewrite script for engine files.
- Do not add `@opennav-ai/engine` as a dependency of `@opennav-ai/opennav`.
- Do not export internal engine services, validators, readers, writers,
  generators, or reporters from a public package path.
- Do not rely on workspace symlinks as proof that packaging works.
- Do not publish with only unit tests passing; run packed-package and example
  checks too.
