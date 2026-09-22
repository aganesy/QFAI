# Structure Steering

> Project-level structure steering. Replace placeholder text with your own
> repo layout and architecture rules.

## Repo layout (high level)

- Top-level directories: `packages/` (the workspace), `scripts/` (repository
  tooling), `tests/` (the annotation carrier and the traceability ledger),
  `.github/` (this repository's own CI), `.qfai/` (its workflow artifacts and
  the assistant tree), `.agents/` (the cross-agent rule masters), `tmp/` (the
  scratch area, untracked)
- Evidence: repository root listing

## Key packages / entrypoints

- Package(s) of interest: `packages/qfai` — the published package, and the
  only one in the workspace. The repository root is private and installs the
  package nowhere (`scripts/check-not-a-dependency.mjs`).
- CLI / service entry: one line per entrypoint, as
  `<entrypoint> -> <the boot obligations it answers>` — the `US-*`, or the
  `CON-API-*` on an API entrypoint, whose surface that entrypoint serves. A
  project with an API service and a worker states which obligations go through
  which, so "the entrypoints the in-scope specs reach" is read off this list
  rather than guessed. Without it a worker can be left out of the phase, or one
  service's obligation recorded against another's, with nothing to detect
  either.
- Core modules: `packages/qfai/src/core` (the validators, the parsers and the
  domain readers), `packages/qfai/src/cli` (argument parsing and the command
  implementations), `packages/qfai/src/shared` (what both use),
  `packages/qfai/assets` (everything `npx qfai init` writes into a project, and
  the schemas the document lanes read)
- Project scripts: `scripts/` — the repository's own guards and pinners, each
  invoked by a `package.json` script or a CI lane. The package ships its own
  under `packages/qfai/assets/scripts/`, which an adopter runs; those are
  distribution rather than operations.
- Production roots:
  - `packages/qfai/src`
  - `packages/qfai/assets`
  - `scripts/*.mjs`
    The first two are what `npm pack` publishes, as source and as the tree
    `npx qfai init` writes. `scripts/*.mjs` ships nowhere and is production all the
    same: a guard that stops running stops reporting, and nothing else would.
    `packages/qfai/tests`, `tests/`, `tmp/` and `packages/qfai/dist` are not
    production roots — the first two are tests, the third is scratch and the
    fourth is build output.

## Architecture constraints

- Boundaries (what must not depend on what):
  - `src/core` does not import from `src/cli`. The direction is one-way:
    a command composes core readers, and a core reader knows nothing about
    how it was invoked. Measured: no file under `src/core` imports `cli`.
  - `src/**` carries no internal spec, decision or version identifier.
    `tsup` copies a doc comment into `dist/*.d.ts` and a string literal into
    the bundle, so both reach a user's machine
    (`.agents/rules/distributed-surface.md`).
- Conventions (naming, file layout):
  - A validator lives in `src/core/validators/<subject>.ts` and its cases in
    `packages/qfai/tests/core/<subject>*.test.ts`. A test's project comes from
    its directory under `packages/qfai/tests/`, which the vitest projects name.
  - Text this repository stores and ships follows
    `.agents/rules/repository-language.md`, which covers source, comments,
    Markdown, commit messages and pull request text. It says nothing about
    what an assistant writes back.

## UI surface paths (SSOT)

The only declaration of which paths render a user-visible surface.
`/qfai-implement` reads this section — and nothing else — to decide whether a
ledger row is UI-affecting
(`.qfai/assistant/skills/qfai-implement/references/ui-affecting.md`), so leaving
it on the placeholder makes that decision unevaluable and lets two agents answer
the same row differently.

Syntax, so the reader is mechanical: one repo-root-relative POSIX glob per
bullet, backticked, nothing else on the line. A path cell matches when any glob
matches it after normalising separators to `/` — a ledger cell that may also
hold a dotted module path is normalised first
(`.qfai/assistant/skills/qfai-implement/references/ui-affecting.md#normalising-owning-module`).

`**` is not one thing across tools — Bash, minimatch and fast-glob disagree on
recursion, on whether it spans zero segments, and on dotfiles — so the matching
rules are fixed here rather than left to whichever matcher an agent reaches for:

- `**` matches **zero or more** path segments, so `src/components/**` matches
  `src/components/Button.tsx` and `src/components/forms/Button.tsx` and
  `src/components` itself.
- `*` matches zero or more characters **within one segment**; it never crosses
  a `/`.
- `?` matches exactly one character within one segment.
- A leading dot is **not** special: `src/**` matches `src/.keep`. Nothing here
  is a shell, so the shell's dotfile rule does not apply.
- Matching is case-sensitive, and both sides are compared after separators are
  normalised to `/`.
- No other metacharacter is recognised. Braces, character classes and negation
  are literal text — write a second bullet instead.
  Write the single bullet `none`
  when the project has no UI surface at all — that is a statement the reader
  accepts, not a gap.

ui_paths:

- `none`

  QFAI ships a command-line tool and no rendered surface, so no path here
  makes a ledger row UI-affecting. What may appear in terminal output is
  settled by `.agents/rules/interface-clarity.md`, which is a writing
  standard rather than a UI surface: it routes no row to a
  `product-surface-reviewer` and asks for no capture.

## Quality gates

This file owns neither half of the gate set. The capabilities a gate set must
cover are in `.qfai/assistant/constitution/quality.md`; the commands that
satisfy them belong in
`.qfai/assistant/catalog/tech.md#standard-commands-copy-paste`. Record project
gate commands there, not here.

## How to run locally

Setup and the QFAI launcher only. Project gate commands (build / test / lint /
typecheck / format / pack) belong in
`.qfai/assistant/catalog/tech.md#standard-commands-copy-paste`; do not repeat
them here.

```bash
pnpm install --frozen-lockfile
npx qfai validate
npx qfai doctor
```
