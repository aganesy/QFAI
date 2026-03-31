# 02 User Stories

## US Catalog

- US-0001-0001: v1421 Layered Spec 必須ファイルセット定義
- US-0001-0002: レイアウト検出ロジック定義
- US-0001-0003: ID フォーマットルール定義
- US-0001-0004: トレーサビリティ連鎖定義
- US-0001-0005: 参照方向ルール定義
- US-0001-0006: Escalation Hook 定義
- US-0001-0007: Drift Protocol 体系化
- US-0001-0008: Skill オーケストレーション設計契約
- US-0001-0009: Steering & Governance フレームワーク定義

## US-0001-0001: v1421 Layered Spec 必須ファイルセット定義

- Parent: CAP-0001
- Goal: spec-XXXX/ に 9 必須ファイル（01_Spec.md, 02_User-stories.md, 03_Acceptance-Criteria.md, 04_Business-Rules.md, 05_Examples.md, 06_Test-Cases.md, 07_Decisions.md, 08_Open-questions.md, 09_delta.md）+ 10_Plan.md を定義し、\_policies/ に 10 ファイル（01_Objective ~ 10_delta）を定義する
- Non-goals: spec-pack（v1.4 形式）や legacy 形式の詳細仕様
- Notes: REQ-0001 準拠。REQUIRED_LAYERED_SPEC_FILES_V1421 および REQUIRED_LAYERED_SHARED_FILES_V1421 として specLayout.ts に実装済み

## US-0001-0002: レイアウト検出ロジック定義

- Parent: CAP-0001
- Goal: spec ディレクトリ内のファイル構成から spec-pack / layered(v1416, v1417, v1421) / legacy を自動判別するロジックを定義する
- Non-goals: レイアウト変換ツールの実装
- Notes: REQ-0002 準拠。collectSpecEntries() で実装済み。v1421 判定は 01_Spec.md + 02_User-stories.md + v1421 マーカー（05_Examples.md / 03_Acceptance-Criteria.md / 04_Business-Rules.md / 06_Test-Cases.md）の存在で判定

## US-0001-0003: ID フォーマットルール定義

- Parent: CAP-0001
- Goal: US-XXXX-YYYY, AC-XXXX-YYYY, BR-XXXX-YYYY, EX-XXXX-YYYY, TC-XXXX-YYYY の ID 形式ルールを定義し、spec 間での ID 衝突を禁止する
- Non-goals: ID の自動採番ツール
- Notes: REQ-0003 準拠。specPackIds.ts で実装済み

## US-0001-0004: トレーサビリティ連鎖定義

- Parent: CAP-0001
- Goal: discussion → specs → tests → code → verification の 5 段連鎖を定義し、各段の成果物と段間のトレーサビリティエッジを明確にする
- Non-goals: 各段の成果物フォーマット仕様（個別 spec で定義）
- Notes: REQ-0004 準拠。旧 spec-0009 US-0009-0001 由来

## US-0001-0005: 参照方向ルール定義

- Parent: CAP-0001
- Goal: \_policies → spec-XXXX 参照を禁止（upper-to-lower）、spec-XXXX → \_policies/CAP/NFR 参照を許可（lower-to-upper）するルールを定義する
- Non-goals: 参照方向の自動修正
- Notes: REQ-0005 準拠。旧 spec-0009 US-0009-0003 由来

## US-0001-0006: Escalation Hook 定義

- Parent: CAP-0001
- Goal: spec-XXXX/01_Spec.md に配置する Escalation Hook（Ambiguous, Conflict, Missing, Trade-off）とエスカレーション先（\_policies/ の特定ファイル）を定義する
- Non-goals: エスカレーションの自動判定ロジック
- Notes: REQ-0006 準拠。旧 spec-0009 US-0009-0004 由来

## US-0001-0007: Drift Protocol 体系化

- Parent: CAP-0001
- Goal: upstream SSOT 保護の原則、ドリフト検出時の Change Request 手順（STOP → CR → 承認 → owner skill rerun → 再開）を体系化する
- Non-goals: ドリフト検出の自動化実装
- Notes: REQ-0007 準拠。旧 spec-0009 US-0009-0005 由来。SSOT: `.qfai/assistant/instructions/drift-protocol.md`

## US-0001-0008: Skill オーケストレーション設計契約

- Parent: CAP-0001
- Goal: 9 Skill（discussion, sdd, atdd, configure, prototyping, verify, tdd-red, tdd-green, tdd-refactor）のカタログ、依存関係（configure -.-> discussion → sdd → prototyping(optional) → atdd → verify）、完了契約を設計仕様として定義する
- Non-goals: SKILL.md の逐語的複製（SSOT は SKILL.md 自体）
- Notes: REQ-0008 準拠。旧 spec-0007 US-0007-0001~0005 由来

## US-0001-0009: Steering & Governance フレームワーク定義

- Parent: CAP-0001
- Goal: Steering 文書（5 ファイル）、Instructions 文書（5 ファイル）、Review Roster（10 reviewers）、Constitution（Article I~X）、Canonical Workflow Stages（Stage 0~6）の設計仕様を定義する
- Non-goals: 各文書の逐語的複製（SSOT は steering/_.md, instructions/_.md）
- Notes: REQ-0009 準拠。旧 spec-0010 US-0010-0001~0006 由来
