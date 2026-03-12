# 04_Sources

## Source Registry

| SRC-ID   | Title                              | Type    | URL / Path                                        | Retrieved  | Notes                                        |
| -------- | ---------------------------------- | ------- | ------------------------------------------------- | ---------- | -------------------------------------------- |
| SRC-0001 | ユーザーリクエスト                 | primary | 本ディスカッション conversation                   | 2026-03-12 | symlink 化の要望と設計方針                   |
| SRC-0002 | init.ts（現行実装）                | primary | packages/qfai/src/cli/commands/init.ts             | 2026-03-12 | 677行、ラッパー生成ロジック                  |
| SRC-0003 | 既存 .agents/skills/ ラッパー      | primary | .agents/skills/qfai-*/SKILL.md                     | 2026-03-12 | 薄いラッパー（~450-580B）                    |
| SRC-0004 | 既存 .codex/skills/ ラッパー       | primary | .codex/skills/qfai-*/SKILL.md                      | 2026-03-12 | 薄いラッパー（~545-590B）                    |
| SRC-0005 | 既存 .claude/commands/ ラッパー    | primary | .claude/commands/qfai-*.md                         | 2026-03-12 | Claude Code slash command ラッパー           |
| SRC-0006 | 既存 .github/prompts/ ラッパー     | primary | .github/prompts/qfai-*.prompt.md                   | 2026-03-12 | GitHub Copilot prompt ラッパー               |
| SRC-0007 | Git symlink 仕様                   | external | https://git-scm.com/docs/gitattributes            | 2026-03-12 | Git のシンボリックリンク取り扱い             |
| SRC-0008 | Node.js fs.symlink API             | external | https://nodejs.org/api/fs.html#fssymlinktarget-path-type-callback | 2026-03-12 | Windows での type パラメータ仕様 |
| SRC-0009 | copilot-instructions.md            | primary | .github/copilot-instructions.md                    | 2026-03-12 | `.github/prompts/` を参照している            |
| SRC-0010 | review-roster.yml                  | primary | .qfai/assistant/steering/review-roster.yml         | 2026-03-12 | レビューロスター定義                         |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Traceability

- Each REQ/NFR should reference at least one SRC-ID.
- Sources without REQ/NFR links should be reviewed for relevance.
