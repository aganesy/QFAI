# 08_Glossary — 用語集

---

## 用語定義

| 用語 | 英語表記 | 定義 |
|---|---|---|
| **ターミナル状態** | terminal state | `fullHarness` の実行が終了した状態。`status=completed` で表される。この状態に遷移すると、`terminationReason`・`finalDecision`・`reviewerSignoff` が確定済みの値を持つ。 |
| **非ターミナル状態** | non-terminal state | `fullHarness` の実行が継続中の状態。`status=in-progress` で表される。`terminationReason` は absent、`finalDecision` と `reviewerSignoff.status` は `pending` でなければならない。 |
| **terminationReason** | terminationReason | ハーネス実行が終了した理由を示すフィールド。有効値は `abandoned`（手動放棄）・`max-iterations`（最大イテレーション到達）・`plateau`（品質向上が頭打ち）の3つ。`in-progress` 状態では absent（フィールドが存在しない）。 |
| **finalDecision** | finalDecision | ハーネス実行の最終判断結果。`pending`（未確定）・`accepted`（承認）・`rejected`（却下）・`abandoned`（放棄）の値を持つ。`in-progress` では `pending` 固定。`completed` では `pending` は禁止。 |
| **reviewerSignoff** | reviewerSignoff | レビュアーによる最終承認フィールド。`status` サブフィールドを持ち、`pending`・`approved`・`rejected`・`abandoned` の値を取る。`finalDecision` と一貫性が必要。 |
| **具体的な artifact ref** | concrete artifact ref | 実際に存在するアーティファクト（ファイル・セクション・スクリーンショット等）を指す参照文字列。プレースホルダー（`"TODO"`・`""`・`"pending"` 等）は含まれない。`assertConcreteArtifactRefs()` ヘルパーが検証する。 |
| **canonical sourceRef** | canonical sourceRef | `readCanonicalScreenContracts()` が返す各スクリーンの `sourceRef` フィールドの値。フォーマット: `.qfai/discussion/<pack>/uiux/40_screen_contracts.md#<screenId>` のみ有効。ルートスラグから生成したアンカーとは区別される。 |
| **screenId** | screenId | スクリーンコントラクト内の各スクリーンを一意に識別する ID。`sourceRef` のアンカー部分に使用される（例: `#SCR-001`）。 |
| **ルートスラグ** | route slug | URL パスを元に生成したアンカー文字列（例: `/screens/top` → `#/screens/top`）。本設計では **禁止**。canonical sourceRef の `screenId` を使用する。 |
| **declaredRef** | declaredRef | `specs[].coverageRefs[].declaredRef` フィールドの値。spec ファイル内の特定の宣言箇所を指す参照。有効フォーマット: `.qfai/specs/<file>#L<n>` または `.qfai/specs/<file>#<anchor>`。 |
| **spec declaration ref** | spec declaration ref | spec ファイル（`.qfai/specs/` 配下）内の特定の行または宣言アンカーを指す参照。`declaredRef` の有効な値。 |
| **状態機械** | state machine | 有限の状態と遷移規則を持つシステムモデル。本設計では `fullHarness` の lifecycle を `in-progress` → `completed` の2状態遷移として定義する。 |
| **full-harness** | full-harness | QFAI の UI prototyping 実行モード。複数のイテレーション（`iterations[]`）を経て証拠を蓄積し、最終的に `completed` 状態に遷移する。`fullHarness` オブジェクトに実行結果が格納される。 |
| **fail-closed** | fail-closed | バリデーションルールが violation を検出した場合、処理を中断してエラーを返す動作方針。warning-only や silent fallback の反対。本設計ではすべてのバリデーションが fail-closed でなければならない。 |
| **absent** | absent | フィールドが存在しない（`undefined` または省略）ことを示す状態の論理表現。`terminationReason=absent` は「`terminationReason` フィールドが存在しない」ことを意味する。 |
| **traceability chain** | traceability chain | REQ → Spec → Code → Test の対応関係を追跡可能な状態。`declaredRef` の semantic 検証（WS-4）はこの chain の spec → code 部分を担保する。 |
| **assertConcreteArtifactRefs** | assertConcreteArtifactRefs | 証拠 ref の配列が非空かつすべてのエントリが具体的な artifact ref であることを検証するヘルパー関数（WS-3 で導入）。全8カテゴリに適用。 |
