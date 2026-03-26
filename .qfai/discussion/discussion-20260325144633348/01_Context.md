# 01_Context

## Metadata

| Key           | Value                                            |
| ------------- | ------------------------------------------------ |
| Discussion ID | discussion-20260325144633348                     |
| Date          | 2026-03-25                                       |
| Owner         | agent                                            |
| Source        | qfai_v1.7.1_render_evidence_automation_design.md |

## Goal and Completion Criteria

- Goal: QFAI v1.7.1 の `Render Evidence Automation` を discussion pack として整理し、`qfai prototyping` が rendered output の構造化証跡を収集・保存・検証できるようにする前提を固める。
- Completion criteria:
  - `qfai prototyping` の render evidence 収集対象、保存先、失敗時の扱い、互換性方針が一貫して説明できる。
  - CLI / config / validator / report / docs / tests の変更範囲と非対象範囲が明確である。
  - `02_Inception-Deck.md` と `03_Story-Workshop.md` が後続の REQ / NFR / 制約整理に耐える粒度を持つ。
  - UI 参照が必要な箇所では、render evidence を読む人向けの画面イメージと操作フローが説明できる。
  - `11_OQ-Register.md` の `Disposition: open` が 0 である。
  - review roster が最終的に `PASS` を返す。

## Existing Structure, Patterns, and Constraints

- 既存の `qfai prototyping` は `uiFidelity` の自動生成や既存 validator 群とつながっている。
- v1.7.1 の主眼は browser QA ではなく、rendered reality を evidence として残すための capture / validate の基盤化である。
- Playwright は必須依存にしない。利用可能なら収集し、不可なら `skipped` と理由を残す。
- evidence は prose ではなく structured data を主とし、markdown は要約に留める。
- 既存の discussion pack は 15 ファイル固定構成で、discussion は spec SSOT を代替しない。
- UI/UX への影響があるため、`03_Story-Workshop.md` ではユーザー視点の流れと画面イメージを明示する必要がある。

## Impact and Risk

- 機能: render evidence の収集・保存・検証ができないと、`qfai prototyping` の品質判断が prose 依存のまま残る。
- 性能: render capture は I/O と browser startup のコストを増やす可能性がある。
- UX: skipped / failed の理由が曖昧だと、利用者が再実行手順を判断できない。
- セキュリティ: base URL / filesystem 出力の扱いを誤ると、意図しない書き込みや外部アクセスを招く。
- 運用: docs と validator の不整合があると、capture できていても運用上は失敗扱いになる。

## Options and Recommendation

| Option | Summary                                                              | Pros                                                 | Cons                                   | Recommendation |
| ------ | -------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- | -------------- |
| A      | CLI 拡張 + helper 分離 + typed outcome で render evidence を導入する | 責務分割しやすい、将来の browser QA に再利用しやすい | 初期実装は少し増える                   | 推奨           |
| B      | `prototyping.ts` に capture ロジックを直書きする                     | 変更範囲が小さく見える                               | すぐに肥大化し、後続拡張で破綻しやすい | 非推奨         |
| C      | 先に browser QA をフル導入して evidence を統合する                   | 収集内容は強い                                       | v1.7.1 のスコープを超える、依存が重い  | 非推奨         |

## Assumptions

- v1.7.1 は capture と validation の導入に限定し、browser QA の full audit は含めない。
- render evidence は `skipped` と `failed` を明示的に持つ。
- validator の severity は profile と観測状態に応じて扱い分ける前提で整理する。
- downstream の `/qfai-sdd` や `/qfai-prototyping` を壊さないことを最優先とする。

## Key Issues

1. `uiFidelity` に render asset path と viewport metadata がまだない。
2. critique / report が prose 中心で、何を見て批評したかの証跡が残りにくい。
3. Playwright 不可時の degraded mode が仕様として明示されていない。
4. capture 対象、保存先、失敗時の扱い、検証の優先順位が分散している。

## Recommended Direction

- `qfai prototyping` に render evidence capture を統合し、新コマンドは作らない。
- `uiFidelity.screens[].renders[]` を追加し、`captured/skipped/failed` を明示する。
- capture 実装は helper に分離し、Playwright は dynamic import にする。
- validator / report / docs / tests を同一変更の中で整合させる。

## Work Orders Summary

| Step | Role (sub-agent) | Task title          | Input (refs)                          | Output (refs)   | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------- | ------------------------------------- | --------------- | -------------------- |
| 1    | worker           | Context first draft | design memo, existing pack, repo SSOT | `01_Context.md` | PASS                 |
| 2    | orchestrator     | Context integration | worker draft, skill constraints       | `01_Context.md` | PASS                 |
