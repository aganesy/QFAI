# 10 Plan

- Spec: spec-0009
- Parent: CAP-0009

## 実装戦略

### フレームワーク設計仕様の特性

CAP-0009 は CLI コマンドではなく、Assistant Framework のトレーサビリティと Layered Spec Architecture に関するフレームワーク設計仕様である。実装対象はランタイムコードではなく、仕様文書と構造検証ルールである。

### 主要成果物

| 成果物 | パス | 操作 | 説明 |
| ------ | ---- | ---- | ---- |
| Traceability spec | `.qfai/specs/spec-0009/01_Spec.md` ~ `08_Open-questions.md` | 新規 | トレーサビリティ連鎖と Layered Spec Architecture を仕様化 |
| _policies 更新 | `.qfai/specs/_policies/03_Capabilities.md` | 修正 | CAP-0009 エントリ追加 |
| _policies 更新 | `.qfai/specs/_policies/04_Business-Flow.md` | 修正 | Drift Recovery Flow 追加 |
| _policies 更新 | `.qfai/specs/_policies/06_Glossary.md` | 修正 | Traceability 関連用語追加 |

### 検証戦略

フレームワーク設計仕様のテストケースは `qfai validate` の構造検証ルールで実現する:

- E_SPEC_MISSING_FILESET: spec-0009 の必須ファイル存在確認
- E_SPEC_MISSING_PARENT: 01_Spec.md に Parent: CAP-0009 が記載されていること
- E_SPEC_AC_WITHOUT_TC: 全 AC に対応する TC が存在すること
- E_SPEC_BR_WITHOUT_EX: 全 BR に対応する EX が存在すること
- E_SPEC_EX_WITHOUT_TC: 全 EX に対応する TC が存在すること
- E_POLICIES_UPPER_TO_LOWER_REF: _policies/ に US/AC/BR/EX/TC 参照がないこと

### ATDD アノテーション

フレームワーク設計仕様は CLI 実行テストを持たないため、ATDD アノテーションは対象外。

## テスト戦略

### L-struct 構造検証（qfai validate）

| 検証項目 | ルール ID | 対応 TC 範囲 |
| -------- | --------- | ------------ |
| 必須ファイルセット存在 | E_SPEC_MISSING_FILESET | TC-0009-0001 |
| Parent CAP 参照 | E_SPEC_MISSING_PARENT | TC-0009-0002 |
| トレーサビリティ連鎖定義 | カスタム検証 | TC-0009-0003~0005 |
| Layered Spec Architecture | カスタム検証 | TC-0009-0006~0008 |
| 参照方向ルール | E_POLICIES_UPPER_TO_LOWER_REF | TC-0009-0009~0011 |
| Escalation Hook | カスタム検証 | TC-0009-0012~0014 |
| Drift Protocol | カスタム検証 | TC-0009-0015~0017 |
| 必須エッジ | E_SPEC_AC_WITHOUT_TC 等 | TC-0009-0018~0020 |

### L5 E2E / L3 Integration / L4 API

- 対象外: フレームワーク設計仕様は CLI 実行テストを持たない

## 依存関係

- spec-0009 は QFAI の構造設計原則を定義するため、全 spec（spec-0001~0010）が本 spec の原則に従う
- spec-0007（Skill Orchestration）の Completion Contract はトレーサビリティ連鎖の一部
- spec-0010（Steering & Governance）の Drift Protocol は本 spec で体系化

## バリデーションルール → TC マッピング

| バリデーションルール | TC-ID |
| -------------------- | ----- |
| E_CHAIN_STAGE_DEFINITION | TC-0009-0001, TC-0009-0002, TC-0009-0003, TC-0009-0004, TC-0009-0005 |
| E_SPEC_REQUIRED_FILES | TC-0009-0007, TC-0009-0008 |
| E_SPEC_PARENT_CAP | TC-0009-0006, TC-0009-0017 |
| E_POLICIES_UPPER_TO_LOWER_REF | TC-0009-0010, TC-0009-0011 |
| E_ESCALATION_HOOK | TC-0009-0012, TC-0009-0013 |
| E_DRIFT_PROTOCOL | TC-0009-0014, TC-0009-0015, TC-0009-0016 |
| E_TRACEABILITY_AC_TC | TC-0009-0018 |
| E_TRACEABILITY_BR_EX | TC-0009-0019 |
| E_TRACEABILITY_EX_TC | TC-0009-0020 |

## リスクと軽減策

| リスク | 影響度 | 軽減策 |
| ------ | ------ | ------ |
| 参照方向ルール違反の見落とし | 高 | qfai validate の E_POLICIES_UPPER_TO_LOWER_REF ルールで自動検出 |
| Drift Protocol の形骸化 | 中 | Reviewer Gate で Drift Protocol 遵守を確認。SKILL.md に Drift Protocol 参照を義務化 |
| トレーサビリティエッジの欠損 | 高 | qfai validate の QFAI-COV-201~206 ルールで自動検出 |

## 実装順序

1. **spec-0009 Slice**: 01_Spec ~ 08_Open-questions（Phase 2 で完了）
2. **_policies 更新**: CAP-0009 追加、Business-Flow 更新、Glossary 拡張（Phase 1 で完了）
3. **10_Plan.md**: 本ファイル（Phase 3）
4. **09_delta.md**: 変更記録（Phase 4）
5. **qfai validate**: 構造検証（Validate Gate）
