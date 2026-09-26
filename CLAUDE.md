# QFAI

Quality-First AI (QFAI) — specification-driven development の検証フレームワークおよび CLI。

## Project Rules

- Follow existing code conventions and patterns in the repository.
- All source changes must have corresponding test coverage.
- TypeScript: avoid bare `as` type assertions; prefer type narrowing.
- TypeScript: await or return every promise. `.agents/rules/minimal-implementation.md`
  § 2 governs consuming callers, kept failures and callback boundaries.
- Keep functions focused; extract when a function exceeds ~50 lines.
- Try solutions in the order `.claude/rules/minimal-implementation.md`
  (master: `.agents/rules/minimal-implementation.md`) sets out, and mark a
  deliberate shortcut with its ceiling and the condition that lifts it.
- What may appear on a screen or in terminal output is settled by
  `.claude/rules/interface-clarity.md` (master:
  `.agents/rules/interface-clarity.md`). Text explaining how to work a control
  is a defect report against that control.
- Interview the decision tree before a design is fixed, in the rounds
  `.claude/rules/grilling.md` (master: `.agents/rules/grilling.md`) sets out.
  The discussion stage holds a session with the user; everywhere else agents
  grill each other and take the griller's recommendation, and only a critical
  decision reaches the user. The request bounds the tree: what it did not ask
  for is neither asked about nor added.
- Every question to the user arrives in the shape its answer has, in the form
  `.claude/rules/user-questions.md` (master: `.agents/rules/user-questions.md`)
  sets out: a structured choice where a listable set of candidates exists, or a
  plain request where none does. Where the host's tool cannot carry it, the
  plain-text fallback keeps the same parts.
- A change to this repository's CI either reaches the workflow templates the
  package ships or says in the diff why it does not, in the form
  `.claude/rules/shipped-ci-parity.md` (master:
  `.agents/rules/shipped-ci-parity.md`) sets out. `pnpm ci:lint` runs the guard.
- Ask the cheapest surface that can answer a question about the repository's
  hosted side, in the order `.claude/rules/api-budget.md` (master:
  `.agents/rules/api-budget.md`) sets out: git, then REST, then GraphQL. One
  call for the whole set. The remaining budget is in the response's headers, not
  in a rate-limit endpoint. `scripts/gh-budget.mjs` answers the two questions
  that cost the most when asked the expensive way.
- Classify an action by how hard it is to undo before it runs, in the classes
  `.claude/rules/action-reversibility.md` (master:
  `.agents/rules/action-reversibility.md`) sets out. A destructive,
  hard-to-reverse or visible action needs the user or a standing instruction.
  An obstacle is never a reason for a destructive shortcut.
- All temporary/scratch files go in `tmp/` — working-tree files only; a test's
  `mkdtemp` sandbox under `os.tmpdir()` is out of scope (see
  `.claude/rules/temporary-files.md`, master: `.agents/rules/temporary-files.md`,
  plus `temporary-files.local.md` for what applies here only).
- Do not create new directories or files at the repository root without explicit
  user approval; editing existing root files is allowed (see
  `.claude/rules/root-additions-policy.md`, master:
  `.agents/rules/root-additions-policy.md`, plus `root-additions-policy.local.md`
  for what applies here only).
- Traceability chain (REQ -> Spec -> Code -> Test) must be maintained; TDD-IDs and TC-Refs must not collide or reference unregistered entries.
- Distributed surface discipline (no internal IDs / version markers in shipped files): see `.claude/rules/distributed-surface.md` (master: `.agents/rules/distributed-surface.md`). The
  surface, the forbidden identifier shapes and the four guards are in
  `.agents/rules/distributed-surface.local.md`.
- SDD ドキュメントの構造 (章構成 / リスト / 表の必須列 / Gherkin / Mermaid) は
  `packages/qfai/assets/mdschema/**` が SSOT。`pnpm lint:mdschema` と
  `pnpm lint:mermaid` が強制する。see `.claude/rules/document-schema.md`
  (master: `.agents/rules/document-schema.md`).
- This repository is written in English: source, comments, Markdown,
  `CHANGELOG.md`, commit messages, and pull request and issue text. It does not
  fix the language an assistant replies in, nor what an adopter writes in their
  own repository. See `.claude/rules/repository-language.md` (master:
  `.agents/rules/repository-language.md`).
- Writing standard for PRs, issues, code comments and Markdown — plain wording,
  no local identifiers, no account of how the work went: see
  `.claude/rules/documentation-clarity.md` (master:
  `.agents/rules/documentation-clarity.md`). The hooks in `.claude/settings.json`
  restate it before a GitHub post and after a Markdown edit.
- Version discipline: branch name pins `packages/qfai/package.json#version`.
  On a pinned branch (`feature/vX.Y.Z`) the pin acts as the user's release
  authorization — sync `package.json`, rename `## [Unreleased]` to
  `## [X.Y.Z] - YYYY-MM-DD`, re-insert an empty `## [Unreleased]`, and commit
  `chore(release): qfai X.Y.Z` before the PR merges. On an unpinned branch all
  of those edits require explicit instruction. Tag / publish / force-push /
  amend / AI-merge always require explicit instruction. See
  `.claude/rules/version-discipline.md` (master:
  `.agents/rules/version-discipline.md`) for full details, and
  `.agents/rules/version-discipline.local.md` for the pin convention this
  repository has adopted.

## Code Review

- See `REVIEW.md` for review policy.
- All review findings, including minor and nit-level, should be posted as inline PR comments.
- Do not suppress low-confidence findings.

## Structure

- Source: `packages/qfai/src/`
- Tests: `packages/qfai/tests/`
- Assets/templates: `packages/qfai/assets/`
- Specs & contracts: `.qfai/specs/`, `.qfai/contracts/`
- Discussion packs: `.qfai/discussion/`
- CI: `.github/workflows/`
- Claude Code rules: `.claude/rules/`

### `.qfai/contracts/cli/`

The contracts for QFAI's own command surface, and for the files QFAI writes into
a consuming project. This directory is the repository's own; the `api/`, `db/`,
`ui/` and `design/` directories beside it hold a project's contracts and belong
to the shipped `qfai-sdd` skill.

Naming and indexing rules: `AGENTS.md`.

### `packages/qfai/` and `.qfai/`

This repository builds the package and is governed by what the package ships,
so the same document often exists in both trees. Edit the one the package
carries.

- **`packages/qfai/`** — the package's source: implementation, tests and the
  assets `qfai init` writes. Features, fixes and skill or rule changes go here.
- **`.qfai/`** — this repository's own workflow artifacts (specs, contracts,
  discussion, evidence), plus the assistant tree. That tree is generated from
  `packages/qfai/assets/init/.qfai/` by `pnpm sync:ssot`, so an edit made
  directly to it is reverted by the next run and fails the tracked-tree diff in
  `pnpm ci:gate`.

The rule masters under `.agents/rules/` are symlinks to
`packages/qfai/assets/init/root/.agents/rules/`, so editing one there edits the
shipped file, which is the intent. A rule about this repository alone is a real
file in that directory.

This repository does not install its own package. There is no `qfai`
dependency, and `scripts/check-not-a-dependency.mjs` refuses an install that
would create one.
