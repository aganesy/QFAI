# Review Request

## Target

- **Kind**: sdd
- **Pack**: `.qfai/specs/spec-0012/`
- **Files**: 10 (01_Spec through 10_Plan)
- **Policy Updates**: `.qfai/specs/_policies/` (03_Capabilities, 04_Business-Flow, 06_Glossary, 07_Constraints, 08_Decisions, 10_delta)

## Roster

- **SSOT**: `.qfai/assistant/steering/review-roster.yml`
- **Reviewers**: 5 (R01: qa-lead, R02: qa-gatekeeper, R03: reviewer, R04: code-reviewer, R05: architect-reviewer)

## Review Cycle

- **Cycle**: 1
- **Date**: 2026-03-15
- **Trigger**: spec-0012 SDD 初回レビュー（devils-advocate / pattern-doubler 追加）

## Review Scope

- **Scope**: sdd
- **Parent Capability**: CAP-0012（レビューエージェント拡張：全否定＋パターン倍増）

## Pre-review Validation

- spec-0012 全 10 ファイル存在確認: YES
  - 01_Spec.md, 02_User-stories.md, 03_Acceptance-Criteria.md, 04_Business-Rules.md
  - 05_Examples.md, 06_Test-Cases.md, 07_Decisions.md, 08_Open-questions.md
  - 09_delta.md, 10_Plan.md
- OQ オープン件数: 0（全 7 OQ が discussion-20260315033313220 にて解決済み）
- 要求定義（REQ）件数: 14 (REQ-0001〜REQ-0014)
- 非機能要求（NFR）件数: 7 (NFR-0001〜NFR-0007)
- ユーザーストーリー（US）件数: 5 (US-0012-0001〜US-0012-0005)
- 受入条件（AC）件数: 12 (AC-0012-0001〜AC-0012-0012)
- ビジネスルール（BR）件数: 13 (BR-0012-0001〜BR-0012-0013)
- テストケース（TC）件数: 29 (TC-0012-0001〜TC-0012-0029)
- 意思決定（DEC）件数: 2 (DEC-0012-0001〜DEC-0012-0002)
- 棄却オプション（REJ）件数: 3 (REJ-0001〜REJ-0003)
- Delta 採用項目: 3 (DELTA-0001〜DELTA-0003)

## SDD Review Criteria

1. **仕様の一貫性**: spec のスコープ/目的が US/AC/EX と矛盾しない
2. **意思決定の可観測性**: delta/decisions/rejected に理由が保持されている
3. **Contracts の妥当性**: 0 contracts（CLI ツール）
4. **Traceability**: spec→tests 紐付けが破綻していない

## Evidence

- `.qfai/discussion/discussion-20260315033313220/` 以下の全ドキュメント
  - `06_REQ.md` — REQ-0001〜REQ-0014
  - `07_NFR.md` — NFR-0001〜NFR-0007
  - `10_Policy.md` — POL-01〜POL-07
  - `11_OQ-Register.md` / `12_OQ-Resolution-Log.md` — 全 7 OQ 解決済み

## RCP Footer

- Applied from: `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`
