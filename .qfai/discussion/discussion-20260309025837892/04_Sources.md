# 04_Sources

## Source Registry

| SRC-ID   | Title                                       | Type    | URL / Path                                                   | Retrieved  | Notes                                                                  |
| -------- | ------------------------------------------- | ------- | ------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------- |
| SRC-0001 | Steering: manifest.md                       | primary | `.qfai/assistant/steering/manifest.md`                       | 2026-03-09 | QFAIの使命・公理・互換性・ガバナンス                                   |
| SRC-0002 | Steering: product.md                        | primary | `.qfai/assistant/steering/product.md`                        | 2026-03-09 | プロダクト定義・ユーザー・成功基準                                     |
| SRC-0003 | Steering: structure.md                      | primary | `.qfai/assistant/steering/structure.md`                      | 2026-03-09 | リポジトリ構造・エントリポイント・規約                                 |
| SRC-0004 | Steering: tech.md                           | primary | `.qfai/assistant/steering/tech.md`                           | 2026-03-09 | 技術スタック・依存関係・制約                                           |
| SRC-0005 | Steering: test-layers.md                    | primary | `.qfai/assistant/steering/test-layers.md`                    | 2026-03-09 | ATDDテストレイヤーポリシー（L3/L4/L5）                                 |
| SRC-0006 | Instructions: workflow.md                   | primary | `.qfai/assistant/instructions/workflow.md`                   | 2026-03-09 | Canonical Workflow Stages (Stage 0〜6)                                 |
| SRC-0007 | Instructions: drift-protocol.md             | primary | `.qfai/assistant/instructions/drift-protocol.md`             | 2026-03-09 | Drift Protocol（upstream SSOT保護）                                    |
| SRC-0008 | Instructions: constitution.md               | primary | `.qfai/assistant/instructions/constitution.md`               | 2026-03-09 | 非交渉条項 Article I〜IX                                               |
| SRC-0009 | Instructions: agent-selection.md            | primary | `.qfai/assistant/instructions/agent-selection.md`            | 2026-03-09 | エージェント委任プレイブック                                           |
| SRC-0010 | Instructions: requirements-decomposition.md | primary | `.qfai/assistant/instructions/requirements-decomposition.md` | 2026-03-09 | 要件分解手順                                                           |
| SRC-0011 | Agent定義ファイル群（39ファイル）           | primary | `.qfai/assistant/agents/*.md`                                | 2026-03-09 | 全39エージェントのMission/Inputs/Deliverables/Stop Conditions          |
| SRC-0012 | Skill定義: qfai-discussion                  | primary | `.qfai/assistant/skills/qfai-discussion/SKILL.md`            | 2026-03-09 | Discussion Skill仕様                                                   |
| SRC-0013 | Skill定義: qfai-sdd                         | primary | `.qfai/assistant/skills/qfai-sdd/SKILL.md`                   | 2026-03-09 | SDD Skill仕様                                                          |
| SRC-0014 | Skill定義: qfai-atdd                        | primary | `.qfai/assistant/skills/qfai-atdd/SKILL.md`                  | 2026-03-09 | ATDD Skill仕様                                                         |
| SRC-0015 | Skill定義: qfai-verify                      | primary | `.qfai/assistant/skills/qfai-verify/SKILL.md`                | 2026-03-09 | Verify Skill仕様                                                       |
| SRC-0016 | Skill定義: qfai-configure                   | primary | `.qfai/assistant/skills/qfai-configure/SKILL.md`             | 2026-03-09 | Configure Skill仕様                                                    |
| SRC-0017 | Skill定義: qfai-prototyping                 | primary | `.qfai/assistant/skills/qfai-prototyping/SKILL.md`           | 2026-03-09 | Prototyping Skill仕様                                                  |
| SRC-0018 | Skill定義: qfai-tdd-red/green/refactor      | primary | `.qfai/assistant/skills/qfai-tdd-*/SKILL.md`                 | 2026-03-09 | 非推奨TDD Skill（ルーティングのみ）                                    |
| SRC-0019 | Specs README                                | primary | `.qfai/specs/README.md`                                      | 2026-03-09 | Layered Spec構造の定義                                                 |
| SRC-0020 | Review Roster                               | primary | `.qfai/assistant/steering/review-roster.yml`                 | 2026-03-09 | 10 reviewersの定義                                                     |
| SRC-0021 | 既存specs: \_policies/                      | primary | `.qfai/specs/_policies/*`                                    | 2026-03-09 | 既存共有ポリシー層（10ファイル）                                       |
| SRC-0022 | 既存specs: spec-0001〜0006                  | primary | `.qfai/specs/spec-0001〜0006/*`                              | 2026-03-09 | 既存CLIコマンド仕様（各10ファイル）                                    |
| SRC-0023 | ユーザー指摘                                | primary | conversation log                                             | 2026-03-09 | 「specs解像度が低い」「Skill/Agent/Traceability/階層構造の情報が薄い」 |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Traceability

- REQ-0001〜REQ-0004 → SRC-0012〜SRC-0018（Skill定義）
- REQ-0005〜REQ-0008 → SRC-0009, SRC-0011（Agent定義）
- REQ-0009〜REQ-0013 → SRC-0007, SRC-0008, SRC-0019（Traceability/Architecture）
- REQ-0014〜REQ-0018 → SRC-0001〜SRC-0006, SRC-0020（Steering/Governance）
- 全REQ → SRC-0023（ユーザー指摘が起点）
