# 08 Glossary

## Term Definitions

| Term                        | Definition                                                                                                                                         | Context                          | Source             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------ |
| Skill                       | QFAIのワークフローにおける独立した実行単位。SKILL.mdファイルで定義され、入力・出力・ロール・完了契約・Evidence要件を持つ。                         | Assistant Framework全体          | SRC-0012〜SRC-0018 |
| Agent（サブエージェント）   | Skill内で委任される専門化された作業者。39種類が定義され、各自がMission・Inputs・Deliverables・Stop Conditions・Sign-off構造を持つ。                | Agent Delegation                 | SRC-0011           |
| Orchestrator                | 作業命令の作成・委任・統合・結果提示のみを行うメタエージェント。第一草稿の直接生成と自己承認が禁止されている。                                     | Agent Delegation                 | SRC-0009, SRC-0012 |
| Capability Probe            | Skill開始時にサブエージェント利用可否を確認するための軽量テスト。失敗時はSimulation Modeの承認を要求する。                                         | Agent Delegation                 | SRC-0012〜SRC-0017 |
| Simulation Mode             | サブエージェントが利用不可の場合にユーザー承認のもとでロールを逐次エミュレートするフォールバック。明示的なopt-in required。                        | Agent Delegation                 | SRC-0009           |
| Layered Spec Architecture   | specsを\_policies/（共有ポリシー層）とspec-XXXX/（Capability固有層）の2層に分離する設計構造。1 CAP = 1 spec directory。                            | Traceability & Spec Architecture | SRC-0019           |
| Escalation Hook             | spec-XXXX/01_Spec.mdに記載される\_policiesへの参照委譲メカニズム。NFR・policy・requirements・evidenceのcopy-downを行う。                           | Traceability & Spec Architecture | SRC-0019           |
| 参照方向ルール              | upper-to-lower禁止（\_policiesにUS/AC/BR/EX/TCを書かない）、lower-to-upper許可（spec-XXXXからCAPを参照）の規則。                                   | Traceability & Spec Architecture | SRC-0019           |
| Traceability Chain          | discussion → specs → tests → code → verificationの5段階連鎖。各段の成果物がIDで追跡可能。                                                          | Traceability & Spec Architecture | SRC-0008           |
| Drift Protocol              | 下流フェーズがupstream SSOTを直接編集することを禁止し、Change Request → ユーザー承認 → owner skill rerunを経由させる変更制御手順。                 | Traceability & Spec Architecture | SRC-0007           |
| Change Request (CR)         | Drift Protocol発動時に作成される変更提案。context, proposed change, 3+選択肢, 推奨, 影響範囲, ユーザー決定を含む。                                 | Traceability & Spec Architecture | SRC-0007           |
| Steering文書                | QFAIの意思決定の背骨。manifest, product, structure, tech, test-layersの5ファイルで構成。                                                           | Steering & Governance            | SRC-0001〜SRC-0005 |
| Instructions文書            | 操作プレイブック。workflow, drift-protocol, constitution, agent-selection, requirements-decompositionの5ファイルで構成。                           | Steering & Governance            | SRC-0006〜SRC-0010 |
| Constitution                | 9つの非交渉条項（Article I〜IX）。Evidence over confidence、No invented facts、SDD is SSOT等。例外なし。                                           | Steering & Governance            | SRC-0008           |
| Review Roster               | `.qfai/assistant/steering/review-roster.yml` で定義される10人のレビュアーリスト。各レビュアーにscope, must_check, can_be_na, na_ruleが定義される。 | Steering & Governance            | SRC-0020           |
| RCP (Review Cycle Protocol) | レビュー周回の手順。append-only、FAIL即修正、roster先頭からの再実行、全PASS/valid N/Aで完了。                                                      | Steering & Governance            | SRC-0020           |
| Canonical Workflow Stages   | Stage 0（steering refresh）〜 Stage 6（verify）の7段階ワークフロー。                                                                               | Steering & Governance            | SRC-0006           |
| Work Orders Summary         | サブエージェント委任の記録テーブル。Step, Role, Task title, Input refs, Output refs, Statusの列を持つ。                                            | Agent Delegation                 | SRC-0012〜SRC-0017 |
| Completion Contract         | 各Skillの完了条件。必須成果物一覧、OQ exit条件、Gate pass条件を含む。                                                                              | Skill Orchestration              | SRC-0012〜SRC-0017 |
| Evidence                    | Skill実行の客観的証拠。.qfai/evidence/配下にmarkdown（人間向け）+ json（機械向け）で記録。gitignored by default。                                  | 全体                             | SRC-0012〜SRC-0017 |

## Abbreviations

| Abbreviation | Full Form                          | Notes                          |
| ------------ | ---------------------------------- | ------------------------------ |
| CAP          | Capability                         | Capability ID（CAP-XXXX）      |
| US           | User Story                         | US-XXXX-XXXX                   |
| AC           | Acceptance Criteria                | AC-XXXX-XXXX                   |
| BR           | Business Rule                      | BR-XXXX-XXXX                   |
| EX           | Example                            | EX-XXXX-XXXX                   |
| TC           | Test Case                          | TC-XXXX-XXXX                   |
| CR           | Change Request                     | Drift Protocol発動時の変更提案 |
| RCP          | Review Cycle Protocol              | レビュー周回手順               |
| SSOT         | Single Source of Truth             | 唯一の正しい情報源             |
| SDD          | Specification-Driven Development   | 仕様駆動開発                   |
| ATDD         | Acceptance Test-Driven Development | 受入テスト駆動開発             |
| TDD          | Test-Driven Development            | テスト駆動開発                 |
| OQ           | Open Question                      | 未解決質問                     |
| NFR          | Non-Functional Requirement         | 非機能要件                     |

## Rules

- Terms must be used consistently across all discussion artifacts.
- Ambiguous or context-dependent terms should include usage context.
