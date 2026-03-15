# RCP Footer (qfai-discussion / SSOT)

この文書は `/qfai-discussion` のレビュー周回（Review Cycle）を「discussion-pack 前提」で固定するための SSOT です。
他skill向けの共通規約ではありません。

---

## Review Target（固定）

- Scope: `discussion`
- Pack: `.qfai/discussion/discussion-<YYYYMMDDhhmmssSSS>/`
- レビュー対象（必須15ファイル）:
  - `01_Context.md`
  - `02_Inception-Deck.md`
  - `03_Story-Workshop.md`
  - `04_Sources.md`
  - `05_Scope.md`
  - `06_REQ.md`
  - `07_NFR.md`
  - `08_Glossary.md`
  - `09_Constraints.md`
  - `10_Policy.md`
  - `11_OQ-Register.md`
  - `12_OQ-Resolution-Log.md`
  - `13_Deferred.md`
  - `14_Review-Request.md`
  - `99_delta.md`

---

## Roster Execution Rule（固定）

- Roster は `.qfai/assistant/steering/review-roster.yml` を読む
- 各レビューは `PASS` / `FAIL` / `N/A` を返す
- `N/A` は `na_rule` を満たす理由が必須
- `FAIL` が1つでも出たら **即修正へ戻る**（後続レビューは回さない）
- 修正後は **review cycle を新規作成し** roster を先頭から再実行する（スキップ禁止）

---

## Validate Hard Gate（必須）

- 各 review cycle で `qfai validate --fail-on error --format github` を実行していること
- `.qfai/report/validate.log` が存在し、最新の成果物に対応していること

---

## discussion-pack 固有の Gate（必須）

以下は validator が **error** として扱うため、`fixed` 判定前に必ず潰す：

1. 命名（最新pack判定）

- pack は `discussion-YYYYMMDDhhmmssSSS/` のみ許可
- 不正な `discussion-*` がある場合は latest 判定が壊れるため、退避または削除する

2. Blocking OQ の解消

- `11_OQ-Register.md` の **Disposition が `open` のまま**で、
  かつ Gate が `discuss|require|sdd` の OQ が残っていないこと
- `open` を残す場合は、**Gateを外す**か `Disposition: deferred/resolved` に変更する

3. Deferred の整合

- OQ register で `deferred` にした OQ-ID は、`13_Deferred.md` に同じ OQ-ID で必ず記載する

4. Story Workshop の Mermaid（最小要件）

- `03_Story-Workshop.md` に mermaid fenced block を最低1つ含める
  - `flowchart` または `sequenceDiagram` を推奨

---

## レビュー観点（discussion-pack 特化）

- Context → Inception Deck → Story Workshop の因果が通っているか
  - 「なぜ作るか」→「誰のためか」→「どんな業務フローか」が矛盾しない
- `06_REQ.md` と `07_NFR.md` の境界が崩れていないか
- Glossary/Constraints/Policy が単なる箇条書きでなく、意思決定（後工程の設計/実装）の入力として使える粒度か
- `99_delta.md` が “更新履歴” ではなく “検討ログ（採用/不採用/基準）” を持っているか

---

## 代表的な FAIL と復旧（discussion-pack 特化）

- FAIL: `11_OQ-Register.md` に open+Gate が残る
  - 復旧: 影響範囲が大きいものは `Disposition: deferred` + `13_Deferred.md` に詳細を移す
- FAIL: `03_Story-Workshop.md` に図がない
  - 復旧: 1本でよいので、登場人物（ペルソナ）と主要分岐が分かる flowchart を入れる
- FAIL: pack 名が不正（latest 判定がブレる）
  - 復旧: 不正 pack を `discussion-legacy-*` に退避し、最新 pack を timestamp 命名で作り直す

---

## 拡張レビュアー

### devils-advocate（11番目）

- 役割: 全否定エージェント — 「現状すべてが間違っている」前提でレビューし、あるべき姿を提示する
- `can_be_na: false` — N/A は許可されない
- FAIL 判定時は必ず具体的代替案を提示すること。代替案なしの FAIL は無効とし、再判定を要求する
- 3 回連続 FAIL → アドバイザリー降格（当該レビューサイクル限定）。降格後はブロッキング力が消失し、フィードバックのみ記録する
- レビュー記録: `R11_devils-advocate.md`

### pattern-doubler（12番目）

- 役割: パターン倍増エージェント — discussion phase では ID 付き項目が少ないため N/A が基本
- `can_be_na: true` — discussion phase では Example Seeds の数と観点網羅性を評価対象とする
- N/A でない場合、追加パターンの根拠提示が必須
- レビュー記録: `R12_pattern-doubler.md`

### 代表的な FAIL と復旧（拡張レビュアー特化）

- FAIL (devils-advocate): 代替案なしの否定のみ
  - 復旧: 具体的な「あるべき姿」と移行パスを記述させ、再判定する
- FAIL (devils-advocate, 3回連続): 無限ループ検知
  - 復旧: アドバイザリー降格を記録し、devils-advocate のフィードバックを advisory として保存。次フェーズに進行する
