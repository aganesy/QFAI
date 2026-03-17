# 10 Delta

## Change Summary

| Date       | Change Type | Section             | Summary                                                                                   | Rationale                                                                        |
| ---------- | ----------- | ------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 2026-03-09 | adopted     | 03_Capabilities.md  | CAP-0007〜0010（フレームワーク設計仕様）を追加                                            | discussion-20260309025837892 で承認済み。Assistant Framework の specs 解像度向上 |
| 2026-03-09 | adopted     | 04_Business-Flow.md | Canonical Workflow Stages / Skill 依存関係 / Drift Recovery / RCP フローを追加            | OQ-0004 解決: \_policies に Assistant Framework フローを追記                     |
| 2026-03-09 | adopted     | 06_Glossary.md      | Orchestrator, Constitution, Capability Probe 等 15 用語 + CR/RCP 略語を追加               | CAP-0007〜0010 で導入される概念の用語定義                                        |
| 2026-03-12 | adopted     | 06_Glossary.md      | AskUserQuestion, AskUserQuestion Protocol の 2 用語を追加                                 | discussion-20260312140531704 で承認。全 Skill 共通の質問方法統一                 |
| 2026-03-12 | adopted     | 06_Glossary.md      | symlink 関連 10 用語を追加（Canonical Skill/Agent, Directory/File Symlink 等）            | discussion-20260312143000000 で承認。symlink アーキテクチャ移行の概念定義        |
| 2026-03-12 | adopted     | 07_Constraints.md   | TC-11〜TC-14（symlink 技術制約）、OC-06〜OC-07（運用制約）を追加                          | discussion-20260312143000000 の TC-01〜TC-04, OC-01〜OC-02 を反映                |
| 2026-03-12 | adopted     | 08_Decisions.md     | DR-0001〜DR-0005（OQ-0001〜0005 の解決結果）を追加                                        | discussion-20260312143000000 で全 OQ 解決済み                                    |
| 2026-03-12 | adopted     | spec-0001           | symlink 関連の仕様詳細（ストーリー・条件・ルール 30 件）を追加                            | symlink アーキテクチャ移行の詳細仕様化                                           |
| 2026-03-12 | adopted     | spec-0001           | 既存のラッパー生成関連の受入条件・ビジネスルールを symlink 方式に更新                     | commands/prompts 生成から symlink 生成への方式変更                               |
| 2026-03-14 | adopted     | 03_Capabilities.md  | CAP-0011（Spec Diff Protocol - インクリメンタル実行）を追加                               | discussion-20260313143000000 で承認済み。SDP の specs 化                         |
| 2026-03-14 | adopted     | 04_Business-Flow.md | SDP Incremental Flow セクションと Mermaid 図を追加                                        | 下流スキルのインクリメンタル処理フローを可視化                                   |
| 2026-03-14 | adopted     | 06_Glossary.md      | SDP, ISA, Preflight Diff, changed_specs 等 7 用語 + 2 略語を追加                          | CAP-0011 で導入される概念の用語定義                                              |
| 2026-03-14 | adopted     | 07_Constraints.md   | TC-15〜TC-16（SDP 技術制約）、OC-08〜OC-09（運用制約）を追加                              | discussion-20260313143000000 の TC-01〜TC-02, OC-01〜OC-02 を反映                |
| 2026-03-14 | adopted     | 08_Decisions.md     | DR-0006〜DR-0011（OQ-0001〜OQ-0006 の解決結果）を追加                                     | discussion-20260313143000000 で全 OQ 解決済み                                    |
| 2026-03-14 | adopted     | spec-0011           | SDP spec 新規作成（01_Spec 〜 10_Plan、全10ファイル）                                     | CAP-0011 の詳細仕様化                                                            |
| 2026-03-14 | adopted     | 06_Glossary.md      | Constitution 定義を Article I〜X に更新、AskUserQuestion Protocol を MUST に更新          | discussion-20260314053646704 で承認。AskUserQuestion MUST 化                     |
| 2026-03-14 | adopted     | 08_Decisions.md     | DR-0012（AskUserQuestion MUST 化）を追加                                                  | discussion-20260314053646704 の OQ 解決結果                                      |
| 2026-03-14 | adopted     | spec-0010           | US/AC/BR/EX/TC 追加（AskUserQuestion MUST 化の設計契約）                                  | CAP-0010 の AskUserQuestion Article X 関連仕様追加                               |
| 2026-03-14 | adopted     | constitution.md     | Article X（AskUserQuestion MUST）を追加                                                   | DR-0012 実装。P1 再読み込みでコンパクト耐性を保証                                |
| 2026-03-14 | adopted     | communication.md    | AskUserQuestion Protocol セクションを追加                                                 | DR-0012 実装。Instructions SSOT に MUST ルールを記載                             |
| 2026-03-14 | adopted     | 9 SKILL.md (pkg)    | AskUserQuestion Protocol（MUST）を全 9 SSOT SKILL.md に追加                               | DR-0012 実装。packages/qfai/assets/init/ の SSOT スキルに MUST ルールを挿入      |
| 2026-03-15 | adopted     | 03_Capabilities.md  | CAP-0012（レビューエージェント拡張：全否定＋パターン倍増）を追加                          | discussion-20260315 で承認済み。レビュー品質強化のための新エージェント導入       |
| 2026-03-15 | adopted     | 04_Business-Flow.md | v1.5.6 レビューサイクルフロー（R11/R12 拡張）セクションと sequenceDiagram を追加          | 全否定・パターン倍増エージェントの実行フローを可視化                             |
| 2026-03-15 | adopted     | 06_Glossary.md      | 全否定エージェント、パターン倍増エージェント、アドバイザリー降格、ID付き項目 4 用語を追加 | CAP-0012 で導入される概念の用語定義                                              |
| 2026-03-15 | adopted     | 07_Constraints.md   | TC-17（無限ループ防止）、OC-10（後方互換）を追加                                          | v1.5.6 の新エージェント導入に伴う制約                                            |
| 2026-03-15 | adopted     | 08_Decisions.md     | DR-0012-001〜DR-0012-003（新エージェント設計方針）を追加                                  | レビューエージェント拡張の意思決定記録                                           |
| 2026-03-17 | adopted     | 02_Initiative.md    | v1.6.0 マイルストーン追加                                                                 | discussion-20260317102145554 の仕様化                                            |
| 2026-03-17 | adopted     | 03_Capabilities.md  | CAP-0014（実装フェーズ統一: qfai-implement）を追加                                         | discussion-20260317102145554 で承認済み。v1.6.0 の specs 化                      |
| 2026-03-17 | adopted     | 04_Business-Flow.md | Skill 依存関係図の Deprecated を Abolished に更新、qfai-implement Replacement を追加       | v1.6.0 の旧スキル廃止を反映                                                     |
| 2026-03-17 | adopted     | 06_Glossary.md      | qfai-implement, test-list.md, Phase 1 Validator, TDD Micro-cycle 4 用語 + TDD-ID 略語を追加 | CAP-0014 で導入される概念の用語定義                                              |
| 2026-03-17 | adopted     | 07_Constraints.md   | TC-18〜TC-20（技術制約）、OC-10〜OC-12（運用制約）を追加                                   | discussion-20260317102145554 の制約を反映                                        |
| 2026-03-17 | adopted     | 08_Decisions.md     | DR-0013〜DR-0016（OQ-0001, OQ-0002, OQ-0003, OQ-0005 の解決結果）を追加                   | discussion-20260317102145554 で全 OQ 解決済み                                    |
| 2026-03-17 | adopted     | spec-0014           | spec-0014 新規作成（01_Spec〜10_Plan、全10ファイル）                                       | CAP-0014 の詳細仕様化                                                            |

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
| 2026-03-14 | 差分検出を git diff のみに依存（DR-0006）            | 単一ソースでは git 不可環境での検出漏れリスク                                       | DO NOT: 差分検出を単一ソースに依存しない。Temptation: git diff だけで十分だと思う                                      |
| 2026-03-14 | verify をインクリメンタル対応（DR-0007）             | 品質ゲートの見落としリスクが許容できない                                            | DO NOT: verify をインクリメンタルにしない。Temptation: 一貫性のため全スキルをインクリメンタル化したい                  |
| 2026-03-14 | SDP v1 で TypeScript を変更（DR-0008）               | ビルド・テスト影響が大きく v1.5.5 に収まらない                                      | DO NOT: SDP v1 で TypeScript を変更しない。Temptation: TS でロジックを実装したい                                       |
| 2026-03-14 | Structural 変更で stale 判定（DR-0010）              | コメント変更等で過剰な再生成が発生                                                  | DO NOT: Structural 変更で stale 判定しない。Temptation: 安全側に倒して全変更を stale にしたい                          |
| 2026-03-14 | policy 変更の影響範囲を自動絞り込み（DR-0011）       | 解析精度が不十分で漏れリスク                                                        | DO NOT: policy 変更の影響範囲を自動で絞り込まない。Temptation: 賢く影響範囲を限定したい                                |
| 2026-03-17 | 旧スキルを非推奨にして段階移行（DR-0013）            | 半移行状態が継続し混乱を招く                                                        | DO NOT: 旧スキルを非推奨状態で残さない。Temptation: 段階的移行が安全だと思う                                           |
| 2026-03-17 | test-list.md を spec ディレクトリ外に配置（DR-0014） | 発見性の低下とバリデータアクセスの複雑化                                            | DO NOT: test-list.md を spec ディレクトリ外に配置しない。Temptation: tdd/ を独立ディレクトリにしたい                   |
| 2026-03-17 | Phase 1 でフルバリデーション実施（DR-0015）          | v1.6.0 のスコープ超過                                                               | DO NOT: Phase 1 でコンテンツバリデーションを含めない。Temptation: 一度に全て検証したい                                 |
| 2026-03-17 | 全件並列実行のサポート（DR-0016）                    | 共有状態がある場合の状態破損リスク                                                  | DO NOT: 共有状態があるスライスを並列実行しない。Temptation: 全件並列で高速化したい                                     |
