# RCP Footer (qfai-sdd / SSOT)

この文書は `/qfai-sdd` の Review Cycle を spec / contract 前提で固定する SSOT です。

---

## Review Target（固定）

- Scope: `sdd`
- レビュー対象:
  - `.qfai/specs/spec-*/**`
  - `.qfai/contracts/**`
  - `.qfai/evidence/**`
  - `.qfai/report/**`

---

## Routing Rule（固定）

- reviewer の選定は `.qfai/assistant/manifest/agent-routing.yml` と `.qfai/assistant/manifest/review-profiles.yml` を読む
- 常設 reviewer:
  - `completion-reviewer`
- 条件付き reviewer:
  - `architecture-reviewer`
  - `product-surface-reviewer`
  - `qa-gatekeeper`
- 各レビューは `PASS` / `REVISE` を返す（in-flight のレビュアー応答の語彙。SSOT は
  `.qfai/assistant/constitution/shared-skill-delegation-baseline.md` の `## Reviewer response template`）
- `REVISE` は review pack の `summary.json` を書き出す際に `status: "FAIL"` へ対応付けられる（同ファイルの
  `### Verdict vocabulary` を参照）。第3の判定値を作らないこと
- `REVISE` が出たら、失敗 reviewer と修正影響を受ける reviewer のみ再実行する

---

## Validate Hard Gate（必須）

- 各 review cycle で `npx qfai validate --profile sdd --fail-on error --format github` を実行していること
- `<paths.outDir>/validate.log`（既定 `.qfai/report/validate.log`）が存在し、最新の成果物に対応していること
  - このファイルは `npx qfai validate` が実行のたびに自動で書き出す。`| tee` などのシェルリダイレクトは不要（PowerShell では動作しないため使用しない）
  - `<paths.outDir>` は `qfai.config.yaml` の `paths.outDir`。既定以外に変更したプロジェクトでは `<paths.outDir>/validate.log` と `<paths.outDir>/run-*/` を見ること
  - 最新性は `validate.log` の `run_log:` 行が最新の `run-*/` を指しているかで確認する

---

## Required Review Artifacts（必須）

各 review cycle で、以下を必ず生成する:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

---

## sdd 特化レビュー観点

- spec の目的 / スコープ / 非スコープが下位レイヤと矛盾しない
- Contracts が spec 用語と一致している
- delta / decisions / rejected が再発防止に十分か
- examples / test-cases / traceability が境界・負例・権限・状態遷移を落としていないか
