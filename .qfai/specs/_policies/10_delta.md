# 10 Delta

## Change Summary

| Date       | Change Type | Section             | Summary                                                                        | Rationale                                                                        |
| ---------- | ----------- | ------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 2026-03-09 | adopted     | 03_Capabilities.md  | CAP-0007〜0010（フレームワーク設計仕様）を追加                                 | discussion-20260309025837892 で承認済み。Assistant Framework の specs 解像度向上 |
| 2026-03-09 | adopted     | 04_Business-Flow.md | Canonical Workflow Stages / Skill 依存関係 / Drift Recovery / RCP フローを追加 | OQ-0004 解決: \_policies に Assistant Framework フローを追記                     |
| 2026-03-09 | adopted     | 06_Glossary.md      | Orchestrator, Constitution, Capability Probe 等 15 用語 + CR/RCP 略語を追加    | CAP-0007〜0010 で導入される概念の用語定義                                        |
| 2026-03-12 | adopted     | 06_Glossary.md      | AskUserQuestion, AskUserQuestion Protocol の 2 用語を追加                      | discussion-20260312140531704 で承認。全 Skill 共通の質問方法統一                 |
| 2026-03-12 | adopted     | 06_Glossary.md      | symlink 関連 10 用語を追加（Canonical Skill/Agent, Directory/File Symlink 等） | discussion-20260312143000000 で承認。symlink アーキテクチャ移行の概念定義        |
| 2026-03-12 | adopted     | 07_Constraints.md   | TC-11〜TC-14（symlink 技術制約）、OC-06〜OC-07（運用制約）を追加               | discussion-20260312143000000 の TC-01〜TC-04, OC-01〜OC-02 を反映                |
| 2026-03-12 | adopted     | 08_Decisions.md     | DR-0001〜DR-0005（OQ-0001〜0005 の解決結果）を追加                             | discussion-20260312143000000 で全 OQ 解決済み                                    |
| 2026-03-12 | adopted     | spec-0001           | symlink 関連の仕様詳細（ストーリー・条件・ルール 30 件）を追加                 | symlink アーキテクチャ移行の詳細仕様化                                           |
| 2026-03-12 | adopted     | spec-0001           | 既存のラッパー生成関連の受入条件・ビジネスルールを symlink 方式に更新          | commands/prompts 生成から symlink 生成への方式変更                               |

## Rejected Decisions

| Date       | Rejected Option                                      | Reason                                                                              | Recurrence Prevention                                                                                                  |
| ---------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2026-03-09 | SKILL.md の内容を specs にフルコピー                 | 二重管理コストが高く不整合リスクが増大                                              | DO NOT: SKILL.md の実装詳細を specs にフルコピーしない。Temptation: specs だけで完結させたい                           |
| 2026-03-09 | SKILL.md を廃止し specs に一元化                     | SKILL.md は AI エージェントが直接参照する SSOT であり spec フォーマットでは運用不可 | DO NOT: SKILL.md を廃止しない。Temptation: 二重管理を根本解消したい                                                    |
| 2026-03-09 | 各エージェントの全契約を spec にフル展開             | 39 × 6 セクション = 大量の重複。agent 定義ファイルが SSOT                           | DO NOT: agent 定義の全量を spec に展開しない。Temptation: specs で全情報を網羅したい                                   |
| 2026-03-09 | CAP を既存フォーマットと異なるセクション構造で追加   | 03_Capabilities.md の構造を複雑化し一貫性が崩れる                                   | DO NOT: 既存フォーマットと異なるセクション構造を導入しない。Temptation: フレームワーク仕様は別カテゴリだから分離すべき |
| 2026-03-12 | canonical ファイル名を `.agent.md` に改名（OQ-0001） | 影響範囲が大きく不要。symlink 名で吸収可能                                          | DO NOT: canonical ファイル名を変更しない。Temptation: ファイル名を揃えたくなる                                         |
| 2026-03-12 | copilot-instructions.md を削除（OQ-0002）            | Copilot 統合のルール記述は引き続き必要                                              | DO NOT: copilot-instructions.md を削除しない。Temptation: prompts 廃止と一緒に消したくなる                             |
| 2026-03-12 | pr-fix/pr-merge を QFAI 管理下に移動（OQ-0003）      | QFAI 外のスキルは QFAI 管理対象外                                                   | DO NOT: QFAI 外スキルを .qfai/assistant/skills/ に取り込まない。Temptation: 全スキルを統一管理したい                   |
| 2026-03-12 | junction + テキストファイル fallback（OQ-0004）      | 二重互換性レイヤーが複雑性を増す                                                    | DO NOT: junction やテキストファイルの fallback を実装しない。Temptation: Windows 互換性を最大化したい                  |
| 2026-03-12 | README.md も symlink 化（OQ-0005）                   | ツール固有の説明が失われる                                                          | DO NOT: README.md を symlink 化しない。Temptation: 全ファイルを統一管理したい                                          |
