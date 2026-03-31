# 10 Plan

- Spec: spec-0008
- Parent: CAP-0008

## 実装戦略

### フレームワーク設計仕様の特性

CAP-0008 は CLI コマンドではなく、Assistant Framework の Agent Delegation に関するフレームワーク設計仕様である。実装対象はランタイムコードではなく、仕様文書と構造検証ルールである。

### 主要成果物

| 成果物                | パス                                                        | 操作 | 説明                              |
| --------------------- | ----------------------------------------------------------- | ---- | --------------------------------- |
| Agent Delegation spec | `.qfai/specs/spec-0008/01_Spec.md` ~ `08_Open-questions.md` | 新規 | 39 エージェントの設計契約を仕様化 |
| \_policies 更新       | `.qfai/specs/_policies/03_Capabilities.md`                  | 修正 | CAP-0008 エントリ追加             |
| \_policies 更新       | `.qfai/specs/_policies/06_Glossary.md`                      | 修正 | Agent/Orchestrator 関連用語追加   |

### 検証戦略

フレームワーク設計仕様のテストケースは `qfai validate` の構造検証ルールで実現する:

- E_SPEC_MISSING_FILESET: spec-0008 の必須ファイル存在確認
- E_SPEC_MISSING_PARENT: 01_Spec.md に Parent: CAP-0008 が記載されていること
- E_SPEC_AC_WITHOUT_TC: 全 AC に対応する TC が存在すること
- E_SPEC_BR_WITHOUT_EX: 全 BR に対応する EX が存在すること
- E_SPEC_EX_WITHOUT_TC: 全 EX に対応する TC が存在すること

### ATDD アノテーション

フレームワーク設計仕様は CLI 実行テストを持たないため、ATDD アノテーション（tests/e2e/, tests/integration/）は対象外。

## テスト戦略

### L-struct 構造検証（qfai validate）

| 検証項目                   | ルール ID              | 対応 TC 範囲      |
| -------------------------- | ---------------------- | ----------------- |
| 必須ファイルセット存在     | E_SPEC_MISSING_FILESET | TC-0008-0001      |
| Parent CAP 参照            | E_SPEC_MISSING_PARENT  | TC-0008-0002      |
| エージェントカタログ網羅性 | カスタム検証           | TC-0008-0003~0005 |
| 標準契約構造               | カスタム検証           | TC-0008-0006~0008 |
| Orchestrator Protocol      | カスタム検証           | TC-0008-0009~0013 |
| Work Orders スキーマ       | カスタム検証           | TC-0008-0014~0018 |

### L5 E2E / L3 Integration / L4 API

- 対象外: フレームワーク設計仕様は CLI 実行テストを持たない

## 依存関係

- spec-0007（Skill Orchestration）の Skill カタログを参照（エージェントが Skill 内で委任されるため）
- spec-0009（Traceability）の Work Orders が本 spec のスキーマに従う
- spec-0010（Steering & Governance）の Review Roster が Reviewer エージェントと関連

## 関連スペック

- spec-0007 (Skill Orchestration): エージェントが実行する 9 Skill の定義。エージェントの mission は Skill のワークフロー内で意味を持つ。

## リスクと軽減策

| リスク                                 | 影響度 | 軽減策                                                                      |
| -------------------------------------- | ------ | --------------------------------------------------------------------------- |
| Agent 定義ファイルと spec の不整合     | 中     | NFR-0101 で SSOT 整合性を検証。spec はサマリーカタログ、agent/\*.md が SSOT |
| 新規エージェント追加時の spec 更新漏れ | 低     | qfai validate でエージェント数と spec 記載数の整合性を検証                  |
| Orchestrator Protocol 違反の検出困難   | 中     | Review Gate で Reviewer がプロトコル遵守を確認                              |

## 実装順序

1. **spec-0008 Slice**: 01_Spec ~ 08_Open-questions（Phase 2 で完了）
2. **\_policies 更新**: CAP-0008 追加、Glossary 拡張（Phase 1 で完了）
3. **10_Plan.md**: 本ファイル（Phase 3）
4. **09_delta.md**: 変更記録（Phase 4）
5. **qfai validate**: 構造検証（Validate Gate）
