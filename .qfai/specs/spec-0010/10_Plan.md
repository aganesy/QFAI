# 10 Plan

- Spec: spec-0010
- Parent: CAP-0010

## 実装戦略

### フレームワーク設計仕様の特性

CAP-0010 は CLI コマンドではなく、Assistant Framework の Steering & Governance に関するフレームワーク設計仕様である。実装対象はランタイムコードではなく、仕様文書と構造検証ルールである。

### 主要成果物

| 成果物 | パス | 操作 | 説明 |
| ------ | ---- | ---- | ---- |
| Steering & Governance spec | `.qfai/specs/spec-0010/01_Spec.md` ~ `08_Open-questions.md` | 新規 | ガバナンス構造の設計契約を仕様化 |
| _policies 更新 | `.qfai/specs/_policies/03_Capabilities.md` | 修正 | CAP-0010 エントリ追加 |
| _policies 更新 | `.qfai/specs/_policies/04_Business-Flow.md` | 修正 | Review Cycle Flow 追加 |
| _policies 更新 | `.qfai/specs/_policies/06_Glossary.md` | 修正 | Steering/Constitution 関連用語追加 |

### 検証戦略

フレームワーク設計仕様のテストケースは `qfai validate` の構造検証ルールで実現する:

- E_SPEC_MISSING_FILESET: spec-0010 の必須ファイル存在確認
- E_SPEC_MISSING_PARENT: 01_Spec.md に Parent: CAP-0010 が記載されていること
- E_SPEC_AC_WITHOUT_TC: 全 AC に対応する TC が存在すること
- E_SPEC_BR_WITHOUT_EX: 全 BR に対応する EX が存在すること
- E_SPEC_EX_WITHOUT_TC: 全 EX に対応する TC が存在すること

### ATDD アノテーション

フレームワーク設計仕様は CLI 実行テストを持たないため、ATDD アノテーションは対象外。

## テスト戦略

### L-struct 構造検証（qfai validate）

| 検証項目 | ルール ID | 対応 TC 範囲 |
| -------- | --------- | ------------ |
| 必須ファイルセット存在 | E_SPEC_MISSING_FILESET | TC-0010-0001 |
| Parent CAP 参照 | E_SPEC_MISSING_PARENT | TC-0010-0002 |
| Steering 文書構造 | カスタム検証 | TC-0010-0003~0005 |
| Instructions 文書構造 | カスタム検証 | TC-0010-0006~0008 |
| Review Roster & RCP | カスタム検証 | TC-0010-0009~0010 |
| Constitution 位置づけ | カスタム検証 | TC-0010-0011 |
| Canonical Workflow Stages | カスタム検証 | TC-0010-0012~0013 |

### L5 E2E / L3 Integration / L4 API

- 対象外: フレームワーク設計仕様は CLI 実行テストを持たない

## 依存関係

- spec-0010 は spec-0007（Skill Orchestration）の Canonical Workflow Stages と密接に関連
- spec-0009（Traceability）の Drift Protocol は Steering の一部として管理
- spec-0008（Agent Delegation）の Reviewer エージェントは Review Roster と関連

## リスクと軽減策

| リスク | 影響度 | 軽減策 |
| ------ | ------ | ------ |
| Steering ファイルと spec の不整合 | 中 | NFR-0101 で SSOT 整合性を検証。spec は設計契約、steering/*.md が SSOT |
| Review Roster 変更時の spec 更新漏れ | 低 | qfai validate で reviewer 数と spec 記載の整合性を検証 |
| Constitution 違反の検出困難 | 中 | Reviewer Gate で Constitution 遵守を確認 |

## 実装順序

1. **spec-0010 Slice**: 01_Spec ~ 08_Open-questions（Phase 2 で完了）
2. **_policies 更新**: CAP-0010 追加、Business-Flow 更新、Glossary 拡張（Phase 1 で完了）
3. **10_Plan.md**: 本ファイル（Phase 3）
4. **09_delta.md**: 変更記録（Phase 4）
5. **qfai validate**: 構造検証（Validate Gate）
