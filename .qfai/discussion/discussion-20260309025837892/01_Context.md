# 01 Context

## Metadata

| Key           | Value                         |
| ------------- | ----------------------------- |
| Discussion ID | discussion-20260309025837892  |
| Date          | 2026-03-09                    |
| Owner         | user                          |
| Source        | ユーザー指摘: specs解像度不足 |

## Goal and Completion Criteria

- Goal: QFAIの「Assistant Framework」（Skills, Agents, Traceability, Spec Architecture, Steering & Governance）を specs に反映し、QFAIの全体像の解像度を飛躍的に向上させる。
- Measurable completion criteria:
  - CAP-0007〜CAP-0010 の4つの新規Capabilityが定義される
  - 各CAPに対応するREQ/NFRが列挙される
  - \_policies/ の拡充方針が明確になる
  - OQ-Register の open が 0 件

## Stakeholders

- Primary stakeholders: AIエージェント開発者（QFAIを利用してSDD/ATDD/TDDワークフローを実行する者）
- Secondary stakeholders: QAエンジニア、プロジェクトリード、OSS貢献者、CI/CDエンジニア

## Background

- Business context: QFAIはAIコーディングエージェントの出力品質を検証するCLIツールだが、CLIコマンド（init, validate, report, doctor, guardrails, prototyping）の仕様のみがspecsに記載されている。QFAIの価値の大部分を占める「Assistant Framework」（9つのSkill、39のサブエージェント、ステアリング文書、ドリフトプロトコル、レイヤードスペック構造）は `.qfai/assistant/` 配下に定義されているが、specs には一切反映されていない。
- Technical context: 現在の specs は `_policies/` + `spec-0001〜0006/` で構成。Assistant Frameworkは `steering/`（5ファイル）、`instructions/`（5ファイル）、`agents/`（39ファイル）、`skills/`（9スキル）で構成されるが、これらの設計意図・相互関係・制約がspecsレベルで文書化されていない。
- Historical context: v1.4でLayered Specs/ATDDが導入、v1.5でDiscussion Packが追加。CLIコマンドの仕様は充実したが、ワークフロー制御層の仕様は暗黙知のまま残った。

## Inputs

- Existing repository facts:
  - `.qfai/assistant/steering/` — 5ファイル（manifest, product, structure, tech, test-layers）
  - `.qfai/assistant/instructions/` — 5ファイル（workflow, drift-protocol, requirements-decomposition, agent-selection, constitution）
  - `.qfai/assistant/agents/` — 39のエージェント定義
  - `.qfai/assistant/skills/` — 9つのスキル定義（SKILL.md）
  - `.qfai/specs/_policies/` — 10ファイル（共有ポリシー層）
  - `.qfai/specs/spec-0001〜0006/` — 各10ファイル（CLIコマンド仕様）
- External references: なし（リポジトリがSSOT）
- Assumptions:
  - CLIコマンド仕様（spec-0001〜0006）は変更しない
  - 新規CAPはCLIコマンドとして実装されるものではなく、フレームワーク設計仕様として定義する
  - \_policies/ の既存ファイルは拡充（追記）のみ行い、破壊的変更は行わない

## Key Issues

- Issue 1: Skill仕様がSKILL.mdに閉じており、specsから参照できない。Skillの入出力・前提条件・完了条件・委任ルールがspecsレベルで体系化されていない。
- Issue 2: 39のサブエージェントの役割・責務・委任ルールがagent定義ファイルに分散しており、全体像を把握するにはファイルを個別に読む必要がある。
- Issue 3: トレーサビリティの連鎖構造（discussion → specs → tests → code → verification）が暗黙的で、constitution.md や drift-protocol.md に断片的に記述されているのみ。
- Issue 4: Layered Spec Architecture（\_policies/ + spec-XXXX/）の設計思想がREADME.mdにのみ存在し、なぜこの構造を採用したか、参照方向のルール、Escalation Hookの意味がspecsで説明されていない。
- Issue 5: Steering & Governance（steering, instructions, review-roster, RCP）の制御構造がspecsに未記載で、QFAIの意思決定メカニズムが不透明。
