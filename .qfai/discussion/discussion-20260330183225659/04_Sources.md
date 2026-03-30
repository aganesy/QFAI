# 04 Sources

## Source Registry

| SRC-ID   | Title | Type    | URL / Path | Retrieved  | Notes |
| -------- | ----- | ------- | ---------- | ---------- | ----- |
| SRC-0001 | spec-0011 Preflight Diff Protocol | primary | `.qfai/specs/spec-0011/01_Spec.md` | 2026-03-30 | 3ソース統合差分検出の仕様定義 |
| SRC-0002 | qfai-prototyping SKILL.md | primary | `.github/skills/qfai-prototyping/SKILL.md` | 2026-03-30 | 現行prototypingスキル定義 |
| SRC-0003 | qfai-implement SKILL.md | primary | `.github/skills/qfai-implement/SKILL.md` | 2026-03-30 | 現行implementスキル定義 |
| SRC-0004 | specLayout.ts | primary | `packages/qfai/src/core/specLayout.ts` | 2026-03-30 | spec検出ロジック（collectSpecEntries） |
| SRC-0005 | validate.ts | primary | `packages/qfai/src/core/validate.ts` | 2026-03-30 | バリデーションパイプライン |
| SRC-0006 | DR-0006 3ソース統合決定 | primary | `.qfai/specs/_policies/08_Decisions.md` | 2026-03-30 | git-only否定、3ソース統合採用の決定記録 |
| SRC-0007 | ユーザー要求 | primary | ディスカッション対話ログ | 2026-03-30 | spec引数省略時の自動検出 + トレーサビリティ検証要求 |
| SRC-0008 | discovery.ts | primary | `packages/qfai/src/core/discovery.ts` | 2026-03-30 | spec発見ユーティリティ |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Traceability

- REQ-0001 ← SRC-0001 (spec-0011 Preflight Diff Protocol)
- REQ-0002 ← SRC-0001, SRC-0006 (DR-0006)
- REQ-0003 ← SRC-0001, SRC-0004 (specLayout.ts)
- REQ-0004 ← SRC-0001
- REQ-0005 ← SRC-0001, SRC-0006
- REQ-0006 ← SRC-0007 (ユーザー要求)
- REQ-0007 ← SRC-0002, SRC-0007
- REQ-0008 ← SRC-0003, SRC-0007
- REQ-0009 ← SRC-0005, SRC-0007
- REQ-0010 ← SRC-0007
