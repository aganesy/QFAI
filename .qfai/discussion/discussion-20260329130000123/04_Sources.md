# 04 Sources

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329130000123 |
| Date          | 2026-03-29                   |

## Source Registry

| SRC-ID   | Type        | Title                            | Location                                                          | Usage                                    |
| -------- | ----------- | -------------------------------- | ----------------------------------------------------------------- | ---------------------------------------- |
| SRC-0001 | design-spec | QFAI v1.7.5 Design Specification | `local file (not committed)`                                      | 全体方針、scope、OQ、review focus        |
| SRC-0002 | ssot        | discussion README                | `.qfai/discussion/README.md`                                      | discussion pack 構造、OQ/Deferred 列定義 |
| SRC-0003 | ssot        | specs README                     | `.qfai/specs/README.md`                                           | downstream `/qfai-sdd` 接続条件          |
| SRC-0004 | ssot        | evidence README                  | `.qfai/evidence/README.md`                                        | evidence file 要件                       |
| SRC-0005 | ssot        | review roster                    | `.qfai/assistant/steering/review-roster.yml`                      | reviewer 順序と N/A 条件                 |
| SRC-0006 | ssot        | RCP footer                       | `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md` | review cycle / validate gate             |
| SRC-0007 | repository  | project architecture             | `.instruction/02_project/architecture.md`                         | 対象 surface が CLI/toolkit であること   |
| SRC-0008 | repository  | tech stack                       | `.instruction/02_project/tech-stack.md`                           | Node/TypeScript/Vitest/pnpm 前提         |

## Traceability Notes

- REQ/NFR/OQ は原則 `SRC-0001` を一次根拠とし、pack format は `SRC-0002` から継承する
- review artifact 構造は `SRC-0005` と `SRC-0006` を同時参照する
- non-ui classification は `SRC-0001` と `SRC-0007` の組み合わせで判断する

## Competitive Reference Registry

Non-ui pack のため該当なし。
