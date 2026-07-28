# RCP Footer (qfai-discussion / SSOT)

この文書は `/qfai-discussion` の Review Cycle を discussion-pack 前提で固定する SSOT です。

---

## Review Target（固定）

- Scope: `discussion`
- Pack: `.qfai/discussion/discussion-<YYYYMMDDhhmmssSSS>/`
- レビュー対象は discussion-pack の必須15ファイル

---

## Routing Rule（固定）

- reviewer の選定は `.qfai/assistant/manifest/agent-routing.yml` と `.qfai/assistant/manifest/review-profiles.yml` を読む
- 常設 reviewer:
  - `completion-reviewer`
  - `requirements-reviewer`
- 条件付き reviewer:
  - `architecture-reviewer` — architecture-affecting decision がある場合
  - `product-surface-reviewer` — UI-bearing の場合
- 各レビューは `PASS` / `FAIL` を返す
- `FAIL` が出たら、失敗 reviewer と修正影響を受ける reviewer のみ再実行する

---

## Validate Hard Gate（必須）

- 各 review cycle で `qfai validate --profile discussion --fail-on error --format github` を実行していること
- `.qfai/report/validate.log` が存在し、最新の成果物に対応していること
  - このファイルは `qfai validate` が実行のたびに自動で書き出す。`| tee` などのシェルリダイレクトは不要（PowerShell では動作しないため使用しない）
  - 最新性は `validate.log` の `run_log:` 行が最新の `.qfai/report/run-*/` を指しているかで確認する

---

## discussion-pack 固有の Gate（必須）

- `11_OQ-Register.md` に `Disposition: open` かつ blocking gate の OQ を残さない
- `13_Deferred.md` は deferred OQ と整合している
- `03_Story-Workshop.md` は Mermaid を最低1つ含む

---

## レビュー観点（discussion-pack 特化）

- Context → Inception Deck → Story Workshop の因果が通っているか
- `06_REQ.md` と `07_NFR.md` の境界が崩れていないか
- Glossary / Constraints / Policy が後工程入力として十分か
- `99_delta.md` に採用/不採用の判断根拠が残っているか
