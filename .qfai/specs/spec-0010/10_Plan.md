# 10 Plan

- Spec: spec-0010
- Parent: CAP-0010

## 実装戦略

### フレームワーク設計仕様の特性

CAP-0010 は CLI コマンドではなく、Assistant Framework の Steering & Governance に関するフレームワーク設計仕様である。実装対象はランタイムコードではなく、仕様文書と構造検証ルールである。

### 主要成果物

| 成果物                     | パス                                                        | 操作 | 説明                               |
| -------------------------- | ----------------------------------------------------------- | ---- | ---------------------------------- |
| Steering & Governance spec | `.qfai/specs/spec-0010/01_Spec.md` ~ `08_Open-questions.md` | 新規 | ガバナンス構造の設計契約を仕様化   |
| AskUserQuestion MUST 追加  | `.qfai/specs/spec-0010/02..06` (US/AC/BR/EX/TC)             | 修正 | Article X・SKILL.md MUST 化の仕様  |
| \_policies 更新            | `.qfai/specs/_policies/03_Capabilities.md`                   | 修正 | CAP-0010 エントリ追加              |
| \_policies 更新            | `.qfai/specs/_policies/04_Business-Flow.md`                  | 修正 | Review Cycle Flow 追加             |
| \_policies 更新            | `.qfai/specs/_policies/06_Glossary.md`                       | 修正 | Constitution/AskUserQuestion 更新  |
| \_policies 更新            | `.qfai/specs/_policies/08_Decisions.md`                      | 修正 | DR-0012 追加                       |
| \_policies 更新            | `.qfai/specs/_policies/10_delta.md`                          | 修正 | AskUserQuestion MUST 化の採用記録  |
| constitution.md            | `.qfai/assistant/instructions/constitution.md`               | 修正 | Article X 追加                     |
| communication.md           | `.qfai/assistant/instructions/communication.md`              | 修正 | AskUserQuestion Protocol 追加      |
| 全 SKILL.md (9 files)      | `.qfai/assistant/skills/qfai-*/SKILL.md`                     | 修正 | SHOULD → MUST 改訂                 |

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

| 検証項目                  | ルール ID              | 対応 TC 範囲      |
| ------------------------- | ---------------------- | ----------------- |
| 必須ファイルセット存在    | E_SPEC_MISSING_FILESET | TC-0010-0001      |
| Parent CAP 参照           | E_SPEC_MISSING_PARENT  | TC-0010-0002      |
| Steering 文書構造         | カスタム検証           | TC-0010-0003~0005 |
| Instructions 文書構造     | カスタム検証           | TC-0010-0006~0008 |
| Review Roster & RCP       | カスタム検証           | TC-0010-0009~0010 |
| Constitution 位置づけ     | カスタム検証           | TC-0010-0011      |
| Canonical Workflow Stages | カスタム検証           | TC-0010-0012~0013 |
| Article X 存在            | カスタム検証           | TC-0010-0014      |
| communication.md 更新     | カスタム検証           | TC-0010-0015      |
| SKILL.md MUST 統一        | カスタム検証           | TC-0010-0016      |
| フォールバック定義        | カスタム検証           | TC-0010-0017      |
| --auto 整合性             | カスタム検証           | TC-0010-0018      |
| コンパクト耐性            | カスタム検証           | TC-0010-0019      |
| 理由なしフォールバック防止 | カスタム検証           | TC-0010-0020      |

### L5 E2E / L3 Integration / L4 API

- 対象外: フレームワーク設計仕様は CLI 実行テストを持たない

## 依存関係

- spec-0010 は spec-0007（Skill Orchestration）の Canonical Workflow Stages と密接に関連
- spec-0009（Traceability）の Drift Protocol は Steering の一部として管理
- spec-0008（Agent Delegation）の Reviewer エージェントは Review Roster と関連

## リスクと軽減策

| リスク                               | 影響度 | 軽減策                                                                 |
| ------------------------------------ | ------ | ---------------------------------------------------------------------- |
| Steering ファイルと spec の不整合    | 中     | NFR-0101 で SSOT 整合性を検証。spec は設計契約、steering/\*.md が SSOT |
| Review Roster 変更時の spec 更新漏れ | 低     | qfai validate で reviewer 数と spec 記載の整合性を検証                 |
| Constitution 違反の検出困難          | 中     | Reviewer Gate で Constitution 遵守を確認                               |
| AskUserQuestion MUST 無視            | 高     | constitution.md Article X（P1 再読み込み）+ 全 SKILL.md 統一で多層防御 |
| コンパクト後にルール消失             | 高     | constitution.md は P1 再読み込み対象。Article X として保持される       |
| SKILL.md 文言の不統一                | 低     | SDD phase で統一テンプレートを定義し全 9 ファイルに一括適用            |

## 実装順序

1. **\_policies 更新**: 06_Glossary（Constitution/AskUserQuestion Protocol 更新）、08_Decisions（DR-0012 追加）、10_delta（採用記録）— Phase 1 で完了
2. **spec-0010 Slice**: 01_Spec 更新 + US/AC/BR/EX/TC 追加（US-0010-0006, AC-0010-0006..0010, BR-0010-0016..0021, EX-0010-0014..0020, TC-0010-0014..0020）— Phase 2 で完了
3. **10_Plan.md**: 本ファイル更新（Phase 3）
4. **09_delta.md**: AskUserQuestion MUST 化の変更記録（Phase 4）
5. **qfai validate**: 構造検証（Validate Gate）
6. **実装（下流）**: constitution.md Article X 追加 → communication.md 更新 → 全 9 SKILL.md MUST 改訂 → _policies/10_delta.md 記録
