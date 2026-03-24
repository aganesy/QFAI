# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                              | AC-Refs                   | Rule                                                                                                                                                     | Notes         | NFR-Refs |
| ------------ | ---------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| BR-0022-0001 | 階層（hierarchy）次元の定義        | AC-0022-0001,AC-0022-0002 | 階層次元は視覚的階層構造（typography scale, spacing, z-depth, CTA prominence）を評価する。スコア 0-100 と prose コメントを記録する                       | REQ-0009 準拠 | NFR-0001 |
| BR-0022-0002 | 明確性（clarity）次元の定義        | AC-0022-0001,AC-0022-0002 | 明確性次元はナビゲーション導線の明瞭さ（CTA ラベル, 情報構造, visual noise の少なさ）を評価する。スコア 0-100 と prose コメントを記録する                 | REQ-0009 準拠 | NFR-0001 |
| BR-0022-0003 | アクセシビリティ次元の定義         | AC-0022-0001,AC-0022-0002 | アクセシビリティ次元はコントラスト比、キーボード操作パス、フォーカス可視性を評価する。スコア 0-100 と prose コメントを記録する                             | REQ-0009 準拠 | NFR-0004 |
| BR-0022-0004 | レスポンシブ次元の定義             | AC-0022-0001,AC-0022-0002 | レスポンシブ次元は desktop/mobile 両 viewport でのレイアウト崩れ・操作性を評価する。スコア 0-100 と prose コメントを記録する                              | REQ-0009 準拠 | NFR-0003 |
| BR-0022-0005 | PASS/FAIL 閾値ルール               | AC-0022-0003              | 各次元のスコアが 70 以上かつ総合スコア（5 次元の平均）が 70 以上であれば PASS。いずれかの次元が 70 未満であれば FAIL                                      | REQ-0009 準拠 |          |
| BR-0022-0006 | FAIL 時の改善指示義務              | AC-0022-0004,AC-0022-0005 | FAIL 判定時、レビュアーは FAIL となった各次元について具体的な改善指示と最低 1 つの代替案を記載しなければならない                                          | REQ-0012 準拠 |          |
| BR-0022-0007 | 破壊的変更デルタ記録義務           | AC-0022-0006              | 破壊的変更が発生した場合、delta に変更内容・影響範囲・マイグレーション手順を記録しなければならない。記録のない破壊的変更はレビューゲートで FAIL とする      | REQ-0011 準拠 | NFR-0008 |
| BR-0022-0008 | レビュー再現性の保証               | AC-0022-0007              | スコアカード rubric は明示的な採点基準を持ち、同一 artifact に同一 rubric を適用した場合の結果差分が 0 であることを保証する                                | NFR-0007 準拠 | NFR-0007 |
| BR-0022-0009 | taskFidelity 次元の定義            | AC-0022-0008,AC-0022-0009 | taskFidelity 次元はスコアカードの第 5 次元として、step count ≤ max_primary_steps・primary CTA 可視性・4 状態実装・error recovery path・破壊的操作確認・primary flow click count を評価する。スコア 0-100 と prose コメントを記録する | REQ-0016 準拠 | NFR-0009 |
| BR-0022-0010 | Warning→Error 昇格ルール           | AC-0022-0010,AC-0022-0011,AC-0022-0012 | qfai validate において以下の 6 条件はエラーとして扱い、警告扱いを禁止する：(1) UI 要件あり + 画面モックなし、(2) UI Contract あり + HTML モックなし、(3) 状態定義あり + empty/loading/error 欠落、(4) primary CTA 不一致、(5) max_primary_steps 超過、(6) critical anti-pattern 違反 | REQ-0017 準拠 | NFR-0010 |
