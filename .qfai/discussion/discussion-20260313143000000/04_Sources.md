# 04_Sources

## Source Registry

| SRC-ID   | Title                     | Type    | URL / Path                                            | Retrieved  | Notes                           |
| -------- | ------------------------- | ------- | ----------------------------------------------------- | ---------- | ------------------------------- |
| SRC-0001 | ユーザー要望（会話ログ）  | primary | discussion-20260313143000000 conversation             | 2026-03-13 | インクリメンタル実装対応の要望  |
| SRC-0002 | qfai-atdd SKILL.md        | primary | .qfai/assistant/skills/qfai-atdd/SKILL.md             | 2026-03-13 | 現行の ATDD スキル定義          |
| SRC-0003 | qfai-prototyping SKILL.md | primary | .qfai/assistant/skills/qfai-prototyping/SKILL.md      | 2026-03-13 | 現行の prototyping スキル定義   |
| SRC-0004 | qfai-sdd SKILL.md         | primary | .qfai/assistant/skills/qfai-sdd/SKILL.md              | 2026-03-13 | SDD スキル定義（上流）          |
| SRC-0005 | qfai-verify SKILL.md      | primary | .qfai/assistant/skills/qfai-verify/SKILL.md           | 2026-03-13 | verify スキル定義（品質ゲート） |
| SRC-0006 | deltaV1.ts                | primary | packages/qfai/src/core/deltaV1.ts                     | 2026-03-13 | delta ファイルパーサー（447行） |
| SRC-0007 | atddTraceability.ts       | primary | packages/qfai/src/core/atddTraceability.ts            | 2026-03-13 | ATDD アノテーション追跡（14KB） |
| SRC-0008 | change-classification.md  | primary | .qfai/assistant/instructions/change-classification.md | 2026-03-13 | 変更分類ルール（Primary/Tags）  |
| SRC-0009 | specs README.md           | primary | .qfai/specs/README.md                                 | 2026-03-13 | Layered spec 構造の定義         |
| SRC-0010 | evidence README.md        | primary | .qfai/evidence/README.md                              | 2026-03-13 | Evidence ファイルの構造定義     |
| SRC-0011 | drift-protocol.md         | primary | .qfai/assistant/instructions/drift-protocol.md        | 2026-03-13 | Drift Protocol 定義             |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
