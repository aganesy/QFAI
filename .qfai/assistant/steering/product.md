# Product Steering

## What are we building?

- Summary: QFAI - AI コーディングエージェント向け品質第一開発キット（CLI）。6つのコマンド（init, validate, report, doctor, guardrails, prototyping）で SDD/ATDD/TDD ワークフローをバリデーションゲートで強制する。
- Evidence: README.md, packages/qfai/package.json, packages/qfai/src/cli/index.ts

## Who is the user?

- Personas / roles:
  - AI コーディングエージェント（Claude Code, GitHub Copilot, Codex, Anthropic Agents）
  - QA エンジニア（バリデーションゲートで品質保証）
  - プロジェクトリード（仕様の一元管理とトレーサビリティ）
  - CI/CD エンジニア（パイプラインへのバリデーション統合）
- Evidence: 02_Inception-Deck.md (Stakeholders)

## What is "success"?

- Success metrics / acceptance definition:
  - 全 CLI コマンドの要件が REQ として定義されている
  - 全バリデーションルール（50+）が仕様化されている
  - トレーサビリティ全エッジ（US->AC->BR->EX->TC）が定義されている
  - qfai validate --fail-on error でエラー 0
- Evidence: 05_Scope.md (Success Criteria)

## Non-goals

- IDE プラグイン / GUI 開発
- コード品質分析（ESLint/SonarQube の代替ではない）
- テスト自体の自動生成
- 自然言語の意味解析
- Evidence: 02_Inception-Deck.md (NOT List), 05_Scope.md (Out of Scope)

## Release posture

- Compatibility policy: semver。CLI コマンド体系の後方互換性を維持。
- Breaking change policy: v2.0 まで破壊的変更は保留。マイグレーションガイド（docs/migrations/）必須。
- Evidence: CHANGELOG.md, 09_Constraints.md (DL-02)

## Open questions

- Blocking: none
- Non-blocking:
  - OQ-0003: validate.json 外部 API 安定性（deferred to v2.0）
  - OQ-0004: レガシー spec-pack 非推奨スケジュール（deferred to v2.0）
