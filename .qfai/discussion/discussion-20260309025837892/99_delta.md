# 99_delta

## Change History

| Date       | Change Type | Section           | Summary                                                       | Rationale                                                                                                 |
| ---------- | ----------- | ----------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 2026-03-09 | adopted     | 01_Context        | Discussion初版作成: QFAIのAssistant Framework specs解像度向上 | ユーザー指摘「specs解像度が低い」を起点に、CAP-0007〜0010の新規定義とpolicies拡充を決定                   |
| 2026-03-09 | adopted     | 02_Inception-Deck | C-3案（4 CAP）を採用                                          | Skill Orchestration, Agent Delegation, Traceability & Spec Architecture, Steering & Governanceの4つに分割 |
| 2026-03-09 | adopted     | 05_Scope          | 混合アプローチ（C案）を採用                                   | \_policies拡充 + 新規spec-XXXX。既存spec-0001〜0006は変更しない                                           |
| 2026-03-09 | adopted     | 06_REQ            | REQ-0001〜0018を定義                                          | 4 CAP × 4〜5 REQ。全must優先度                                                                            |
| 2026-03-09 | adopted     | 11_OQ-Register    | OQ-0001〜0005を全てresolved                                   | テストケース粒度、二重管理、カタログ粒度、Business-Flow追記範囲、CAP追加フォーマット                      |

## Change Types

- `adopted`: Decision accepted and applied to artifacts.
- `rejected`: Option considered but not adopted (include Recurrence Prevention).
- `drift`: Scope or direction change during discussion.
- `correction`: Error fix in existing content.

## Rejected Decisions

| Date       | OQ-ID   | Rejected Option                                      | Reason                                                                                                      | Recurrence Prevention                                                                                                                                    |
| ---------- | ------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-09 | OQ-0001 | Option B: 仕様遵守チェックリストをTCとする           | 検証自動化が困難で、qfai validateとの整合性が低い                                                           | DO NOT: フレームワーク仕様CAPに手動チェックリスト型TCを定義しない。Temptation: 「構造検証では不十分」と感じた時                                          |
| 2026-03-09 | OQ-0001 | Option C: テストケースを定義しない                   | layered spec構造の必須ファイル（06_Test-Cases.md）が空になりvalidation error                                | DO NOT: 06_Test-Cases.mdを空にしない。Temptation: 「CLIコマンドではないからTCは不要」と判断した時                                                        |
| 2026-03-09 | OQ-0002 | Option B: specsにSKILL.mdの内容を完全コピー          | 二重管理コストが高く、不整合リスクが増大                                                                    | DO NOT: SKILL.mdの実装詳細をspecsにフルコピーしない。Temptation: 「specsだけで完結させたい」と感じた時                                                   |
| 2026-03-09 | OQ-0002 | Option C: SKILL.mdを廃止しspecsに一元化              | SKILL.mdはAIエージェントが直接参照するSSOTであり、specのフォーマットでは運用不可                            | DO NOT: SKILL.mdを廃止しない。Temptation: 「二重管理を根本解消したい」と感じた時                                                                         |
| 2026-03-09 | OQ-0003 | Option B: 各エージェントの全契約をspecにフル展開     | 39 × 6セクション = 大量の重複。agent定義ファイルがSSOT                                                      | DO NOT: agent定義の全量をspecに展開しない。Temptation: 「specsで全情報を網羅したい」と感じた時                                                           |
| 2026-03-09 | OQ-0004 | Option C: 追記せず、spec-0007/spec-0010のみで説明    | \_policies/04_Business-Flow.mdはQFAI全体の業務フローのSSOTであり、Assistant Frameworkフローの欠如は情報格差 | DO NOT: \_policies/04_Business-Flow.mdへのAssistant Frameworkフロー追記を省略しない。Temptation: 「specレベルで説明すれば十分」と判断した時              |
| 2026-03-09 | OQ-0005 | Option B: CLIコマンドCAPと分離して別セクションを作る | 03_Capabilities.mdの構造を複雑化し、既存フォーマットとの一貫性が崩れる                                      | DO NOT: 03_Capabilities.mdに既存フォーマットと異なるセクション構造を導入しない。Temptation: 「フレームワーク仕様は別カテゴリだから分離すべき」と感じた時 |

## Drift Events

0 items — 議論中のスコープ変更なし。
