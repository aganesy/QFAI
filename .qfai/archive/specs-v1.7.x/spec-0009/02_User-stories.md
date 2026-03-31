# 02 User Stories

## US Catalog

- US-0009-0001: トレーサビリティ連鎖定義 - 5段連鎖（discussion → specs → tests → code → verification）の成果物と関係を定義
- US-0009-0002: Layered Spec Architecture定義 - \_policies/ と spec-XXXX/ の2層構造を定義
- US-0009-0003: 参照方向ルール定義 - upper-to-lower禁止、lower-to-upper許可のルールを定義
- US-0009-0004: Escalation Hook定義 - spec-XXXX/01_Spec.md から \_policies への参照委譲メカニズムを定義
- US-0009-0005: Drift Protocol体系化 - upstream SSOT保護と変更管理手順を体系化

## US-0009-0001: トレーサビリティ連鎖定義

- Parent: CAP-0009
- Goal: discussion → specs → tests → code → verification の5段連鎖を定義し、各段の成果物と段間のトレーサビリティエッジを明確にする
- Non-goals: 各段の成果物の具体的フォーマット仕様（個別 spec で定義）
- Notes: REQ-0009 準拠。5段連鎖は QFAI フレームワーク全体の品質保証基盤となる

## US-0009-0002: Layered Spec Architecture定義

- Parent: CAP-0009
- Goal: \_policies/（共有ポリシー層）と spec-XXXX/（Capability固有層）の2層構造を定義し、1 CAP = 1 spec directory の対応関係を確立する
- Non-goals: \_policies/ 内の各ファイルの詳細コンテンツ仕様
- Notes: REQ-0010 準拠。実行コンシューマーはデフォルトで spec-XXXX/01_Spec.md のみを読む

## US-0009-0003: 参照方向ルール定義

- Parent: CAP-0009
- Goal: upper-to-lower（\_policies → spec-XXXX）参照を禁止し、lower-to-upper（spec-XXXX → \_policies/CAP/NFR）参照のみを許可するルールを定義する
- Non-goals: 参照方向の自動検出・修正ツールの実装仕様
- Notes: REQ-0011 準拠。\_policies は US/AC/BR/EX/TC や spec-XXXX 参照を含んではならない

## US-0009-0004: Escalation Hook定義

- Parent: CAP-0009
- Goal: spec-XXXX/01_Spec.md に配置する Escalation Hook のトリガー条件（Ambiguous, Conflict, Missing, Trade-off）とターゲット（\_policies/ の特定ファイル）を定義する
- Non-goals: Escalation の自動判定ロジック
- Notes: REQ-0012 準拠。Escalation Hook は \_policies を「必要時のみ読む」メカニズムを提供する

## US-0009-0005: Drift Protocol体系化

- Parent: CAP-0009
- Goal: upstream SSOT 保護の原則、ドリフト検出時の Change Request 手順（STOP → CR → 承認 → owner skill rerun → 再開）、および許可された例外を体系化する
- Non-goals: ドリフト検出の自動化実装
- Notes: REQ-0013 準拠。SSOT: `.qfai/assistant/instructions/drift-protocol.md`
