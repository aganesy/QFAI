# QFAI

Quality-First AI (QFAI) — specification-driven development の検証フレームワークおよび CLI。

## Project Rules

- Follow existing code conventions and patterns in the repository.
- All source changes must have corresponding test coverage.
- TypeScript: avoid bare `as` type assertions; prefer type narrowing.
- TypeScript: every async path must have explicit error handling.
- Keep functions focused; extract when a function exceeds ~50 lines.
- All temporary/scratch files go in `tmp/` (see `.claude/rules/temporary-files.md`).
- Traceability chain (REQ -> Spec -> Code -> Test) must be maintained; TDD-IDs and TC-Refs must not collide or reference unregistered entries.

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

### ⚠️ packages/qfai/ と .qfai/ の区別（重要）

本リポジトリは QFAI パッケージの開発リポジトリであると同時に、QFAI 自体を npm インストールして運用している。

- **`packages/qfai/`** — QFAI パッケージのソースコード。機能追加・バグ修正・skill テンプレート改善などはすべてここを修正する。
- **`.qfai/`** — インストールされた QFAI の運用ディレクトリ（specs, contracts, discussion, skills 等）。パッケージ改善目的では修正しない。

skill やバリデータを改善したいときに `.qfai/` 配下を誤って編集しないこと。
