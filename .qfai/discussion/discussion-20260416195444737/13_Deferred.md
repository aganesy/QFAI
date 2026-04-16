# 13_Deferred — 延期事項レジスタ

---

> このファイルはディスカッションフェーズで `deferred` となった OQ・決定事項を記録する。
> 各 deferred 事項は SDD（Software Design Document）フェーズ以降の適切な gate で再開する。

---

## Deferred Items

| OQ-ID | Title | Gate | Deferred-Reason | Deferred-Until | Owner | Due | Severity | Impact | Mitigation | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| OQ-0002 | `refSemantics.ts` 新規ファイル vs 既存モジュールインライン定義 | sdd | 実装詳細であり REQ-0006/REQ-0007 の達成を妨げない。SDD フェーズのアーキテクチャレビューで決定することが適切。今回の PR スコープに含めるとファイル構成の設計判断が実装フェーズに持ち越されるリスクがある。 | SDD フェーズ開始時 — `packages/qfai/src/core/` のモジュール構成レビュー実施後 | agent | sddフェーズ開始時 | low | spec: REQ-0006/REQ-0007 が参照するヘルパーの配置先不定。tests: semanticRefs.test.ts の分離判断に影響。implementation: 重複コードが生じる可能性。operations: 影響なし。 | `assertConcreteArtifactRefs()` と `declaredRef` バリデーション正規表現を `l2Evidence.ts` および `specCoverage.ts` にインラインで定義し、重複が生じた場合は SDD フェーズの切り出し判断を待つ。 | SRC-0001 sec7-2, OQ-0002 discussion log |

---

## 補足

- DEF-0001 は今回の PR の **機能的な DoD（REQ-0006, REQ-0007 のテスト GREEN）には影響しない**。
- SDD フェーズ開始時に DEF-0001 を再度 OQ として起票し、アーキテクチャレビューの議題に含めること。
- `refSemantics.ts` を導入する場合のテストファイル（`prototypingEvidence.semanticRefs.test.ts`）も同フェーズで設計する。
