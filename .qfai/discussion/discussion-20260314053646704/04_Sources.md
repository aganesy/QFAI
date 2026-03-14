# 04 Sources

## ソーストレーサビリティ

| SRC-ID   | ソース種別              | ファイル / 参照先                                                             | 関連要件                     | 備考                                                                     |
| -------- | ----------------------- | ----------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| SRC-0001 | ユーザーフィードバック  | ユーザー要望「MUST レベルに昇格し、コンパクト実行後もルールが残るようにする」 | REQ-0001, REQ-0002, REQ-0003 | 本 discussion の発端                                                     |
| SRC-0002 | 既存 SKILL.md           | `.qfai/assistant/skills/qfai-discussion/SKILL.md`                             | REQ-0001, REQ-0004           | AskUserQuestion Protocol セクションの現状文言                            |
| SRC-0003 | 既存 SKILL.md           | `.qfai/assistant/skills/qfai-sdd/SKILL.md`                                    | REQ-0001, REQ-0004           | AskUserQuestion Protocol セクションの現状文言                            |
| SRC-0004 | 既存 SKILL.md           | `.qfai/assistant/skills/qfai-atdd/SKILL.md`                                   | REQ-0001, REQ-0004           | AskUserQuestion Protocol セクションの現状文言                            |
| SRC-0005 | 既存 SKILL.md           | `.qfai/assistant/skills/qfai-configure/SKILL.md`                              | REQ-0001, REQ-0004           | AskUserQuestion Protocol セクションの現状文言                            |
| SRC-0006 | 既存 SKILL.md           | `.qfai/assistant/skills/qfai-prototyping/SKILL.md`                            | REQ-0001, REQ-0004           | AskUserQuestion Protocol セクションの現状文言                            |
| SRC-0007 | 既存 SKILL.md           | `.qfai/assistant/skills/qfai-tdd-green/SKILL.md`                              | REQ-0001, REQ-0004           | AskUserQuestion Protocol セクションの現状文言                            |
| SRC-0008 | 既存 SKILL.md           | `.qfai/assistant/skills/qfai-tdd-red/SKILL.md`                                | REQ-0001, REQ-0004           | AskUserQuestion Protocol セクションの現状文言                            |
| SRC-0009 | 既存 SKILL.md           | `.qfai/assistant/skills/qfai-tdd-refactor/SKILL.md`                           | REQ-0001, REQ-0004           | AskUserQuestion Protocol セクションの現状文言                            |
| SRC-0010 | 既存 SKILL.md           | `.qfai/assistant/skills/qfai-verify/SKILL.md`                                 | REQ-0001, REQ-0004           | AskUserQuestion Protocol セクションの現状文言                            |
| SRC-0011 | constitution.md         | `.qfai/assistant/instructions/constitution.md`                                | REQ-0002, NFR-0001           | Article I〜IX の現状。Article X 追加対象                                 |
| SRC-0012 | communication.md        | `.qfai/assistant/instructions/communication.md`                               | REQ-0003, NFR-0002           | Output language / Reporting / Error handling のみ。追加対象              |
| SRC-0013 | Glossary                | `.qfai/specs/_policies/06_Glossary.md`                                        | REQ-0001                     | AskUserQuestion / AskUserQuestion Protocol の定義（2026-03-12 追加済み） |
| SRC-0014 | delta.md                | `.qfai/specs/_policies/10_delta.md`                                           | REQ-0005                     | 既存の change history。本変更エントリ追加対象                            |
| SRC-0015 | Constitution Article VI | `.qfai/assistant/instructions/constitution.md#Article-VI`                     | REQ-0001                     | Clarification budget（最大 5 質問）。Article X と整合させる必要あり      |

## ソース評価

| SRC-ID             | 信頼性              | 最終確認日 | 備考                               |
| ------------------ | ------------------- | ---------- | ---------------------------------- |
| SRC-0001           | 高（一次ソース）    | 2026-03-14 | ユーザー直接要望                   |
| SRC-0002〜SRC-0010 | 高（SSOT ファイル） | 2026-03-14 | リポジトリ上の実ファイルを確認済み |
| SRC-0011〜SRC-0012 | 高（SSOT ファイル） | 2026-03-14 | リポジトリ上の実ファイルを確認済み |
| SRC-0013〜SRC-0015 | 高（SSOT ファイル） | 2026-03-14 | リポジトリ上の実ファイルを確認済み |
