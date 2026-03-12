# 10 Delta

## Change Summary

| Date       | Change Type | Section             | Summary                                                                        | Rationale                                                                        |
| ---------- | ----------- | ------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 2026-03-09 | adopted     | 03_Capabilities.md  | CAP-0007〜0010（フレームワーク設計仕様）を追加                                 | discussion-20260309025837892 で承認済み。Assistant Framework の specs 解像度向上 |
| 2026-03-09 | adopted     | 04_Business-Flow.md | Canonical Workflow Stages / Skill 依存関係 / Drift Recovery / RCP フローを追加 | OQ-0004 解決: \_policies に Assistant Framework フローを追記                     |
| 2026-03-09 | adopted     | 06_Glossary.md      | Orchestrator, Constitution, Capability Probe 等 15 用語 + CR/RCP 略語を追加    | CAP-0007〜0010 で導入される概念の用語定義                                        |

## Rejected Decisions

| Date       | Rejected Option                                    | Reason                                                                              | Recurrence Prevention                                                                                                  |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2026-03-09 | SKILL.md の内容を specs にフルコピー               | 二重管理コストが高く不整合リスクが増大                                              | DO NOT: SKILL.md の実装詳細を specs にフルコピーしない。Temptation: specs だけで完結させたい                           |
| 2026-03-09 | SKILL.md を廃止し specs に一元化                   | SKILL.md は AI エージェントが直接参照する SSOT であり spec フォーマットでは運用不可 | DO NOT: SKILL.md を廃止しない。Temptation: 二重管理を根本解消したい                                                    |
| 2026-03-09 | 各エージェントの全契約を spec にフル展開           | 39 × 6 セクション = 大量の重複。agent 定義ファイルが SSOT                           | DO NOT: agent 定義の全量を spec に展開しない。Temptation: specs で全情報を網羅したい                                   |
| 2026-03-09 | CAP を既存フォーマットと異なるセクション構造で追加 | 03_Capabilities.md の構造を複雑化し一貫性が崩れる                                   | DO NOT: 既存フォーマットと異なるセクション構造を導入しない。Temptation: フレームワーク仕様は別カテゴリだから分離すべき |
