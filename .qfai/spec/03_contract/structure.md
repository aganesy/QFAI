# Structure

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
- CLI / service entry: `qfai` (`packages/qfai/dist/cli/index.mjs`) ->
  `US-0003-0001`. One entrypoint, and workspace initialization is what its
  startup serves: it is the first command an adopter runs, it runs before the
  project has a configuration for anything else to read, and every other command
  reads the tree it writes. The Skeleton phase's exit criterion follows from that
  choice, so it is recorded in `.qfai/evidence/skeleton.md` rather than left to be
  re-derived.

- Core modules: `packages/qfai/src/core` (the validators, the parsers and the
  domain readers), `packages/qfai/src/cli` (argument parsing and the command
  implementations), `packages/qfai/src/shared` (what both use),
  `packages/qfai/assets` (everything `npx qfai init` writes into a project, and
  the schemas the document lanes read)
- Project scripts: `scripts/` — the repository's own guards and pinners, each
  invoked by a `package.json` script or a CI lane. The Skeleton phase's smoke
  script is `scripts/smoke-qfai-cli.mjs`.
  The package ships its own
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
  - A validator lives under `src/core/validators/` and its cases under
    `packages/qfai/tests/core/`, named for the same subject. A test's project comes from
    its directory under `packages/qfai/tests/`, which the vitest projects name.
  - Text this repository stores and ships follows
    `.agents/rules/repository-language.md`, which covers source, comments,
    Markdown, commit messages and pull request text. It says nothing about
    what an assistant writes back.

## UI surface paths (SSOT)

The only declaration of which paths render a user-visible surface.
`/qfai-implement` reads this section — and nothing else — to decide whether a
ledger row is UI-affecting
(`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md`), so leaving
it on the placeholder makes that decision unevaluable and lets two agents answer
the same row differently.

Syntax, so the reader is mechanical: one repo-root-relative POSIX glob per
bullet, backticked, nothing else on the line. A path cell matches when any glob
matches it after normalising separators to `/` — a ledger cell that may also
hold a dotted module path is normalised first
(`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md#normalising-owning-module`).

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
cover are in `.qfai/assistant/rule/quality.md`; the commands that
satisfy them belong in
`.qfai/spec/03_contract/tech.md#standard-commands-copy-paste`. Record project
gate commands there, not here.

## How to run locally

Run the applicable Standard commands in
`.qfai/spec/03_contract/tech.md#standard-commands-copy-paste`.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                         | Examples                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| BR-0010 | On the story tree, `paths.specsDir` (default `.qfai/spec`) holds `decisions.md`, `open-questions.md`, `01_policy/` and `02_business-flow/`. The contract layer sits at `paths.contractsDir`, which defaults to `03_contract/` under `paths.specsDir` (`.qfai/spec/03_contract/cli/qfai-init.md#the-spec-tree`)                                                                                    | EX-0001-0005-01, EX-0001-0005-02                                   |
| BR-0011 | On the story tree, `02_business-flow/` holds `business-flows.md`, which lists every flow, and one `business-flow-NNNN/` directory per flow. A flow directory holds `business-flow.md`, which carries at least one Mermaid diagram; `user-stories.md`, which lists the flow's stories; and one `user-story-NNNN-NNNN/` directory per story. An index file keeps a plural name because it is a list | EX-0001-0005-03                                                    |
| BR-0012 | On the story tree, a `user-story-NNNN-NNNN/` directory holds exactly `01_User-story.md`, `02_Acceptance-Criteria.md` (Gherkin) and `03_Example.md`, with no other file and no subdirectory (`.qfai/spec/03_contract/cli/qfai-validate.md#finding-families`, Story directory)                                                                                                                      | EX-0001-0005-04, EX-0001-0005-05, EX-0001-0005-06, EX-0001-0005-07 |
| BR-0013 | On the story tree, `01_policy/` holds `objective.md`, `initiative.md`, `principle.md`, `glossary.md` and `constraint.md`. The layer states principles and criteria; a concrete definition belongs to a flow, a story or a contract                                                                                                                                                                | EX-0001-0006-01                                                    |
| BR-0014 | On the story tree, the contract layer at `paths.contractsDir` holds `contracts.md`, `tech.md`, `structure.md` and the directories `api/`, `db/`, `ui/`, `cli/` and `design/`. `CON-*` contract IDs keep their current form                                                                                                                                                                        | EX-0001-0006-02                                                    |
| BR-0015 | On the story tree, `contracts.md` has a row for every contract artifact under `paths.contractsDir` family directories. A contract file with no row is an error (`.qfai/spec/03_contract/cli/qfai-validate.md#finding-families`, Unlisted contract)                                                                                                                                                | EX-0001-0006-03, EX-0001-0006-04                                   |
