# 05_Scope

## In Scope

- Capability 1: **CAP-0007 Skill Orchestration** — 9つのSkillの仕様・依存関係・実行フロー・完了契約・Evidence要件をspec-0007として定義
- Capability 2: **CAP-0008 Agent Delegation** — 39のサブエージェントの役割・責務・委任ルール・停止条件・標準契約構造をspec-0008として定義
- Capability 3: **CAP-0009 Traceability & Spec Architecture** — トレーサビリティ連鎖・Layered Spec設計思想・参照方向ルール・Escalation Hook・Drift Protocolをspec-0009として定義
- Capability 4: **CAP-0010 Steering & Governance** — Steering文書・Instructions文書・Review Roster/RCP・Constitution・Canonical Workflow Stagesをspec-0010として定義
- \_policies拡充: `03_Capabilities.md` にCAP-0007〜0010を追加、`04_Business-Flow.md` にAssistant Frameworkフローを追加、`06_Glossary.md` にSkill/Agent/Steering関連用語を追加

## Out of Scope

- 既存spec-0001〜0006の変更（CLIコマンド仕様は現状維持）
- CLIコマンドの新規追加（`qfai skill` 等のコマンド化は将来課題）
- 実装コードの変更
- steering/instructions/agentsファイル自体の書き換え（specsは参照・体系化のみ）
- IDE plugin・GUI仕様
- テスト自動生成
- NLP解析

## Constraints

- Technical constraints: 新規spec-0007〜0010はlayered spec構造（10ファイル/spec）に準拠する。既存の `qfai validate` で検証可能な形式を維持する。
- Operational constraints: \_policies/ の変更は追記のみ（既存内容の削除・変更は禁止）。CAP-0001〜0006のIDは変更しない。
- Legal / compliance constraints: MIT license準拠

## Success Criteria

| Criterion | Measurement                                                | Target                                   | Priority |
| --------- | ---------------------------------------------------------- | ---------------------------------------- | -------- |
| SC-001    | CAP-0007〜0010のspec-XXXX/が全ファイル（01〜10）揃う       | 4 specs × 10 files = 40 files            | must     |
| SC-002    | \_policies/03_Capabilities.mdにCAP-0007〜0010が追記される  | 4 CAP entries                            | must     |
| SC-003    | `qfai validate --fail-on error` が新規specsに対してエラー0 | error = 0                                | must     |
| SC-004    | 全Skill（9）がspec-0007のUSで参照される                    | 9/9 coverage                             | must     |
| SC-005    | 全Agent（39）がspec-0008のカタログで参照される             | 39/39 coverage                           | should   |
| SC-006    | トレーサビリティ連鎖の全ノードがspec-0009で定義される      | discussion/specs/tests/code/verification | must     |

## Assumptions

- Assumption 1: 新規CAPはCLIコマンドとして実装されるものではなく、フレームワーク設計仕様として定義する。そのため、06_Test-Cases.mdには実装テストではなく「仕様検証テスト」（qfai validateで検証可能な構造ルール）を記載する。
- Assumption 2: SKILL.mdとagent定義ファイルは引き続きSSOTであり、specsはそれらの設計意図・制約・相互関係を記録する上位文書の位置づけとする。
- Assumption 3: Steering/Instructions文書は引き続き `.qfai/assistant/` 配下に存在し、specsはそれらの構造と役割を説明する。
