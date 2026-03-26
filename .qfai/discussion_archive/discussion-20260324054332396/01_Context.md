# 01_Context

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260324054332396 |
| Date          | 2026-03-24                   |
| Owner         | user                         |
| Source        | v1.6.5 feature request       |

## Goal and Completion Criteria

- Goal: QFAI v1.6.5 で、Claude Code / Codex / GitHub Copilot だけで完結しても「かっこいい」デザイン、明確な UI/UX、画面遷移、導線、プロトタイプ品質を出しやすくするための discussion pack を定義する。
- Completion:
  - discussion pack 15 ファイルが作成済み
  - `Design Direction Pack` を discussion 起点で必須化する判断が記録済み
  - UI 関連 requirements / NFR / OQ が downstream に渡せる粒度で確定
  - `11_OQ-Register.md` の `Disposition: open` が 0

## Background

- 既存の `spec-0013` は UI 定義 3 点セットとレビュー枠組みを持つが、テーマ、空気感、テイスト、CTA 階層、導線、ダサい generic UI を避ける強制力が弱い。
- ユーザーは Figma AI 級の見た目と速度を、Claude Code / Codex / GitHub Copilot 単体で再現したい。
- OpenAI 公式記事は、良いフロントエンドは design brief、visual thesis、narrative、anti-goals、rendered UI critique が前提だと示す。
- ローカルレポートは、デザイン力向上を主観で終わらせず、token・scorecard・VRT/a11y/perf・回帰防止までつなぐ必要を示す。

## Stakeholders

- Primary: QFAI maintainers, QFAI users, Claude Code / Codex / GitHub Copilot users
- Secondary: downstream skill authors (`/qfai-sdd`, `/qfai-prototyping`, `/qfai-implement`, `/qfai-atdd`), reviewers, CI maintainers

## Key Risks

- 既存 `spec-0013` と二重管理になり、SSOT がぼやける
- 「かっこいい」を抽象語のまま requirements 化して downstream で再現できない
- Figma 依存に寄せると QFAI の CLI 完結性を損なう
- 破壊的変更を広げすぎると semver と移行負荷の整理が必要になる

## Work Orders Summary

| Step | Role (sub-agent) | Task title                | Input (refs)                                         | Output (refs)                         | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------------- | ---------------------------------------------------- | ------------------------------------- | -------------------- |
| 1    | researcher       | Design research synthesis | User request, OpenAI blog, local report, `spec-0013` | Research memo integrated into Context | PASS                 |
| 2    | orchestrator     | Discussion integration    | Research memo, repo SSOT, review rules               | `01_Context.md`                       | PASS                 |
