# Manifest (Decision Spine)

## Product / Mission

- Summary: QFAI は AI コーディングエージェント向けの品質第一開発キット（CLI ツール）。SDD/ATDD/TDD を統合し、50以上のバリデーションルールで仕様・コントラクト・トレーサビリティを検証する。
- Value: エージェントの仕様ドリフト・ハルシネーションを客観的ゲートで検出し、品質を保証する。
- Evidence: README.md, packages/qfai/package.json (description), 02_Inception-Deck.md

## Axioms (Non-negotiable)

- Axioms / principles (non-negotiable):
  - 正確性 > 網羅性 > 使いやすさ > パフォーマンス > 拡張性（Trade-off priority）
  - バリデータは純粋 async 関数（副作用なし、Issue[] を返すのみ）
  - レイヤードスペック: 1 CAP = 1 spec directory
  - ドリフトプロトコル: 上流成果物の無断編集禁止
- Decision lens (what we optimize for): 誤検知最小化（信頼性）、トレーサビリティ完全性
- Evidence: 02_Inception-Deck.md (Trade-offs), 09_Constraints.md (TC-09)

## Compatibility vs Change Rubric

- Criteria (Compatibility): validate.json は内部契約（安定 API ではない）。CLI コマンド体系は semver に従う。
- Criteria (Change): 破壊的変更は v2.0 まで保留。マイグレーションガイド必須。
- Examples: `_shared/` -> `_policies/` 改名 (v1.5.3), spec-pack -> layered 移行 (v1.4.17)
- Evidence: CHANGELOG.md, OQ-0003 (validate.json), OQ-0004 (legacy deprecation)

## Governance (Ownership / Review / Evidence)

- Owner: aganesy (maintainer)
- Review / approval: 10-reviewer roster (review-roster.yml), RCP with PASS/FAIL/N/A
- Evidence requirements: evidence file per skill run, validate.log, specs-coverage
- Update cadence: Per release (semver)
- Evidence: .qfai/assistant/steering/review-roster.yml

## Evidence

- Rule: All claims must have repo evidence (source code, config, CHANGELOG, discussion-pack)
- Evidence: .qfai/discussion/discussion-20260313143000000/ (latest pack)
- Assumptions: None (all verified from repository analysis)

## Non-goals / Not-now (Optional)

- IDE プラグイン / GUI 開発
- プラグイン機構（v2.0 で再検討）
- テスト自動生成
- Evidence: 05_Scope.md (Out of Scope), OQ-0001, OQ-0002

## References (Optional)

- product.md
- tech.md
- structure.md
