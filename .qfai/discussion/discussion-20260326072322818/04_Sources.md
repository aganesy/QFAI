# 04 Sources

## Source Registry

| SRC-ID   | Title | Type    | URL / Path | Retrieved  | Notes |
| -------- | ----- | ------- | ---------- | ---------- | ----- |
| SRC-0001 | QFAI v1.7.2 Design Document | primary | qfai_v1.7.2_design_audit_slop_guardrails_design.md | 2026-03-26 | 設計文書（Design Audit & Slop Guardrails） |
| SRC-0002 | QFAI v1.7.0 Discussion Design Hardening | primary | .qfai/discussion/ (previous packs) | 2026-03-26 | v1.7.0 の DDP/DDS バリデーション基盤 |
| SRC-0003 | Existing DDP Validation | primary | packages/qfai/src/core/validators/ddpValidation.ts | 2026-03-26 | 既存の DDP バリデータ実装 |
| SRC-0004 | Existing Design Token Validator | primary | packages/qfai/src/core/validators/designToken.ts | 2026-03-26 | 既存の design token バリデータ |
| SRC-0005 | Existing Design Fidelity Validator | primary | packages/qfai/src/core/validators/designFidelity.ts | 2026-03-26 | 既存の design fidelity バリデータ |
| SRC-0006 | Existing UI Definition Consistency | primary | packages/qfai/src/core/validators/uiDefinitionConsistency.ts | 2026-03-26 | 既存の UI 定義整合性バリデータ |
| SRC-0007 | QFAI Issue Type Definition | primary | packages/qfai/src/core/types.ts | 2026-03-26 | Issue 型定義と severity/category |
| SRC-0008 | QFAI Config Structure | primary | packages/qfai/src/core/config.ts | 2026-03-26 | QfaiConfig / QfaiUiuxConfig 型 |
| SRC-0009 | DDP Banned Patterns | primary | packages/qfai/src/core/validators/ddpBannedPatterns.txt | 2026-03-26 | 既存の banned pattern リスト |
| SRC-0010 | Discussion Visuals Validator | primary | packages/qfai/src/core/validators/discussionVisuals.ts | 2026-03-26 | 既存の discussion visuals チェック |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
