# 11_OQ-Register

## Open Question Register

| OQ-ID   | Title                                          | Gate    | Disposition | Owner | Rationale                                                  | Options                                                                                                                         | Recommendation                                                 | Next-Decision-Point | Due    | Evidence               |
| ------- | ---------------------------------------------- | ------- | ----------- | ----- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------- | ------ | ---------------------- |
| OQ-0001 | 全否定エージェントの無限ループ防止策           | discuss | resolved    | agent | 全否定の性質上FAILが際限なく出る可能性がある               | (A) 最大リトライ回数を設定（例: 3回）, (B) 全否定のFAILに「改善度閾値」を設ける, (C) 3回目以降はFAILを参考意見に降格            | (C) 3回目以降はFAILを参考意見に降格                            | -                   | v1.5.6 | ユーザー回答・NFR-0007 |
| OQ-0002 | ロースター内の実行順序（既存10名の後 vs 混在） | discuss | resolved    | agent | 新エージェントの配置が既存フローに影響する                 | (A) 既存10名の後に全否定→パターン倍増の順, (B) 既存レビュアー間に挟む, (C) 最初に実行して早期フィードバック                     | (A) 既存10名の後に全否定→パターン倍増の順                      | -                   | v1.5.6 | CON-03, NFR-0003       |
| OQ-0003 | パターン倍増の「1パターン」カウント基準        | discuss | resolved    | agent | 何を1パターンと数えるかが曖昧だと倍増判定ができない        | (A) ID付き項目（US-XXXX等）を1パターンとする, (B) テーブル行を1パターンとする, (C) Example Mapping perspectiveを1パターンとする | (A) ID付き項目（US-XXXX等）を1パターンとする                   | -                   | v1.5.6 | CON-06                 |
| OQ-0004 | 全否定エージェントのcan_be_na設定              | discuss | resolved    | user  | 全否定が常に必須か、スキップ可能かで運用負荷が変わる       | (A) can_be_na: false（常に必須）, (B) can_be_na: true（条件付きスキップ可）                                                     | (A) can_be_na: false（常に必須）                               | -                   | v1.5.6 | ユーザー回答           |
| OQ-0005 | パターン倍増エージェントのcan_be_na設定        | discuss | resolved    | user  | パターン倍増が常に必須か、スキップ可能かで運用負荷が変わる | (A) can_be_na: false（常に必須）, (B) can_be_na: true（パターン追加が不要な場合スキップ可）                                     | (B) can_be_na: true（パターン追加が不要なskillではスキップ可） | -                   | v1.5.6 | 設計判断               |
| OQ-0006 | 全否定エージェントの「具体的代替案」提示義務   | discuss | resolved    | agent | 単なる否定だけではFAIL判定が不当になりうる                 | (A) 代替案必須（なければFAIL無効）, (B) 代替案推奨（なくてもFAIL有効）, (C) 代替案なしのFAILは参考意見降格                      | (A) 代替案必須（なければFAIL無効）                             | -                   | v1.5.6 | POL-01                 |
| OQ-0007 | 両エージェントのscope設定                      | discuss | resolved    | agent | 全skill適用だがrostertのscope記法を決める必要がある        | (A) scope: [discuss, require, sdd]（既存と同じ）, (B) scope: [all]（新記法追加）, (C) scopeフィールドを使わずSKILL.md側で制御   | (A) scope: [discuss, require, sdd]（既存と同じ）               | -                   | v1.5.6 | SRC-0001               |

## Summary

- Total OQs: 7
- Disposition: open = **0**, resolved = 7, deferred = 0, rejected = 0
