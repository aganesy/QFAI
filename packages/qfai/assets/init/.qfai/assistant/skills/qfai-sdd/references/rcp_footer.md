# RCP Footer (qfai-sdd / SSOT)

この文書は `/qfai-sdd` のレビュー周回（Review Cycle）を「spec/contract 前提」で固定するための SSOT です。
discussion-pack 等の共通規約ではありません。

---

## Review Target（固定）

- Scope: `sdd`
- 主要成果物（レビュー対象）:
  - `.qfai/specs/spec-*/**`（spec pack）
  - `.qfai/contracts/**`（API/DB/UI 契約）
  - `.qfai/evidence/**`（意思決定根拠・実験ログ）
  - `.qfai/report/**`（validate / coverage / preflight 出力）

---

## Roster Execution Rule（固定）

- Roster は `.qfai/assistant/steering/review-roster.yml` を読む
- 各レビューは `PASS` / `FAIL` / `N/A` を返す
- `FAIL` が1つでも出たら **即修正へ戻る**
- 修正後は **review cycle を新規作成し** roster を先頭から再実行する（スキップ禁止）

---

## Validate Hard Gate（必須）

- 各 review cycle で `qfai validate --fail-on error --format github` を実行していること
- `.qfai/report/validate.log` が存在し、最新の成果物に対応していること

---

## spec-pack 固有のレビュー観点（sdd 特化）

1. 仕様の一貫性

- spec の「目的/スコープ/非スコープ」が、後続の user story / acceptance criteria / examples と矛盾しない
- “例（Examples）” が acceptance criteria を **具体ケースとして裏付け**ている（単なる繰り返しではない）

2. 意思決定の可観測性（Decision Log）

- `delta` / decisions / rejected が「なぜ採用/不採用か」を保持している
- “Temptation（再発しがちな誤り）” が明文化され、再採用防止になっている

3. Contracts の妥当性

- API / UI / DB 契約が spec の用語と一致している（同一概念に別名を付けない）
- 禁止参照（contracts 特例ルール等）がある場合は、契約側の README のルールに従っている

4. Traceability（必要なら）

- spec → tests（ATDD/TDD）への紐付けが破綻していない
- “数を増やす” のではなく “境界/負例/権限/状態遷移” の観点が埋まっている

---

## 代表的な FAIL と復旧（sdd 特化）

- FAIL: acceptance criteria が抽象的で、例に落ちていない
  - 復旧: 例（Examples）に「入力→状態→出力」形式のケースを追加し、境界/異常系を1つは入れる
- FAIL: 契約が先行し、spec の用語・概念とズレる
  - 復旧: 先に Glossary/Capabilities を補強し、契約を spec に合わせて修正する
- FAIL: decision/rejected が薄く、なぜそうしたかが追えない
  - 復旧: 代替案A/B/Cと採用基準を書き、Rejected に DO NOT/Temptation を残す
