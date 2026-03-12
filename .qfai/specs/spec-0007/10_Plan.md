# 10 Plan

- Spec: spec-0007
- Parent: CAP-0007

## 実装戦略

### フレームワーク設計仕様の特性

CAP-0007 は CLI コマンドではなく、Assistant Framework の Skill Orchestration に関するフレームワーク設計仕様である。実装対象はランタイムコードではなく、仕様文書と構造検証ルールである。

### 主要成果物

| 成果物               | パス                                                        | 操作 | 説明                               |
| -------------------- | ----------------------------------------------------------- | ---- | ---------------------------------- |
| Skill カタログ spec  | `.qfai/specs/spec-0007/01_Spec.md` ~ `08_Open-questions.md` | 新規 | 9 Skill の設計契約を仕様化         |
| \_policies 更新      | `.qfai/specs/_policies/03_Capabilities.md`                  | 修正 | CAP-0007 エントリ追加              |
| \_policies 更新      | `.qfai/specs/_policies/04_Business-Flow.md`                 | 修正 | Canonical Workflow Stages 追加     |
| \_policies 更新      | `.qfai/specs/_policies/06_Glossary.md`                      | 修正 | Skill 関連用語追加                 |
| AskUserQuestion 拡張 | `.qfai/specs/spec-0007/01_Spec.md` ~ `06_Test-Cases.md`     | 修正 | REQ-0005 追加、US/AC/BR/EX/TC 拡張 |

### 検証戦略

フレームワーク設計仕様のテストケースは `qfai validate` の構造検証ルールで実現する:

- E_SPEC_MISSING_FILESET: spec-0007 の必須ファイル（01~08, 10_Plan, 09_delta）存在確認
- E_SPEC_MISSING_PARENT: 01_Spec.md に Parent: CAP-0007 が記載されていること
- E_SPEC_AC_WITHOUT_TC: 全 AC に対応する TC が存在すること
- E_SPEC_BR_WITHOUT_EX: 全 BR に対応する EX が存在すること
- E_SPEC_EX_WITHOUT_TC: 全 EX に対応する TC が存在すること

### ATDD アノテーション

フレームワーク設計仕様は CLI 実行テストを持たないため、ATDD アノテーション（tests/e2e/, tests/integration/）は対象外。テストケースは L-struct（構造検証）レベルで `qfai validate` が担う。

## テスト戦略

### L-struct 構造検証（qfai validate）

| 検証項目               | ルール ID              | 対応 TC                      |
| ---------------------- | ---------------------- | ---------------------------- |
| 必須ファイルセット存在 | E_SPEC_MISSING_FILESET | TC-0007-0001                 |
| Parent CAP 参照        | E_SPEC_MISSING_PARENT  | TC-0007-0002                 |
| AC-TC エッジ           | E_SPEC_AC_WITHOUT_TC   | TC-0007-0003~0007, 0017~0022 |
| BR-EX エッジ           | E_SPEC_BR_WITHOUT_EX   | TC-0007-0008~0012, 0017~0022 |
| EX-TC エッジ           | E_SPEC_EX_WITHOUT_TC   | TC-0007-0013~0016, 0017~0022 |

### L5 E2E / L3 Integration / L4 API

- 対象外: フレームワーク設計仕様は CLI 実行テストを持たない

## 依存関係

- spec-0007 は spec-0001~0006 に依存しない（独立したフレームワーク設計仕様）
- spec-0008（Agent Delegation）は spec-0007 の Skill カタログを参照する可能性がある
- spec-0009（Traceability）は spec-0007 の Completion Contract を参照する可能性がある

## 関連スペック

- spec-0008 (Agent Delegation): Skill が委任する 39 サブエージェントの定義。Skill の roles 属性で参照されるエージェントは spec-0008 で定義される。

## リスクと軽減策

| リスク                         | 影響度 | 軽減策                                                               |
| ------------------------------ | ------ | -------------------------------------------------------------------- |
| SKILL.md と spec の不整合      | 中     | NFR-0101 で SSOT 整合性を検証。spec は設計意図、SKILL.md は運用 SSOT |
| Skill 追加時の spec 更新漏れ   | 低     | qfai validate で Skill 数と spec 記載数の整合性を検証                |
| 非推奨 Skill の移行先不明確    | 低     | AC-0007-0005 で明示的に移行先を記載                                  |
| AskUserQuestion セクション欠落 | 中     | TC-0007-0022 で全 9 スキル網羅を検証。BR-0007-0022 で適用義務を定義  |

## 実装順序

1. **spec-0007 Slice**: 01_Spec ~ 08_Open-questions（Phase 2 で完了）
2. **\_policies 更新**: CAP-0007 追加、Business-Flow 更新、Glossary 拡張（Phase 1 で完了）
3. **10_Plan.md**: 本ファイル（Phase 3）
4. **09_delta.md**: 変更記録（Phase 4）
5. **qfai validate**: 構造検証（Validate Gate）
