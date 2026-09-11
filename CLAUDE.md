# QFAI

Quality-First AI (QFAI) — specification-driven development の検証フレームワークおよび CLI。

## Project Rules

- Follow existing code conventions and patterns in the repository.
- All source changes must have corresponding test coverage.
- TypeScript: avoid bare `as` type assertions; prefer type narrowing.
- TypeScript: every async path must have explicit error handling.
- Keep functions focused; extract when a function exceeds ~50 lines.
- Try solutions in the order `.claude/rules/minimal-implementation.md`
  (master: `.agents/rules/minimal-implementation.md`) sets out, and mark a
  deliberate shortcut with its ceiling and the condition that lifts it.
- What may appear on a screen or in terminal output is settled by
  `.claude/rules/interface-clarity.md` (master:
  `.agents/rules/interface-clarity.md`). Text explaining how to work a control
  is a defect report against that control.
- All temporary/scratch files go in `tmp/` — working-tree files only; a test's `mkdtemp` sandbox under `os.tmpdir()` is out of scope (see `.claude/rules/temporary-files.md`, master: `.agents/rules/temporary-files.md`).
- Do not create new directories or files at the repository root without explicit user approval; editing existing root files is allowed (see `.claude/rules/root-additions-policy.md`, master: `.agents/rules/root-additions-policy.md`).
- Traceability chain (REQ -> Spec -> Code -> Test) must be maintained; TDD-IDs and TC-Refs must not collide or reference unregistered entries.
- Distributed surface discipline (no internal IDs / version markers in shipped files): see `.claude/rules/distributed-surface.md` (master: `.agents/rules/distributed-surface.md`).
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
  `.agents/rules/version-discipline.md`) for full details.

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

### ⚠️ packages/qfai/ と .qfai/ の区別（重要）

本リポジトリは QFAI パッケージの開発リポジトリであると同時に、QFAI 自体を npm インストールして運用している。

- **`packages/qfai/`** — QFAI パッケージのソースコード。機能追加・バグ修正・skill テンプレート改善などはすべてここを修正する。
- **`.qfai/`** — インストールされた QFAI の運用ディレクトリ（specs, contracts, discussion, skills 等）。パッケージ改善目的では修正しない。

skill やバリデータを改善したいときに `.qfai/` 配下を誤って編集しないこと。
