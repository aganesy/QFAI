# 09 Delta

## Change Summary

| Date       | Change Type | Section   | Summary                                                                      | Rationale                                                   |
| ---------- | ----------- | --------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 2026-03-14 | adopted     | spec-0011 | SDP spec 新規作成（01_Spec 〜 10_Plan、全10ファイル）                        | discussion-20260313143000000 に基づく CAP-0011 の詳細仕様化 |
| 2026-03-14 | adopted     | 01_Spec   | Preflight Diff Protocol + ISA + Incremental Execution の3層構造を定義        | REQ-0001〜REQ-0013, NFR-0001〜NFR-0005 を spec 形式で構造化 |
| 2026-03-14 | adopted     | 02_US     | US-0011-0001〜0004（差分検出、ISA、スケルトン更新、Evidence 基点記録）を定義 | discussion US-0001〜0004 を spec ID 体系にマッピング        |
| 2026-03-14 | adopted     | 03_AC     | AC-0011-0001〜0022（22件）を Gherkin 形式で定義                              | discussion AC 13件 + 追加 AC 9件（REQ/NFR カバレッジ向上）  |
| 2026-03-14 | adopted     | 04_BR     | BR-0011-0001〜0025（25件）を定義                                             | AC 分解による明示的なビジネスルール化                       |
| 2026-03-14 | adopted     | 05_EX     | EX-0011-0001〜0028（28件）を6パースペクティブでカバー                        | Happy/Negative/Edge/Permission/State/Idempotency の網羅     |
| 2026-03-14 | adopted     | 06_TC     | TC-0011-0001〜0028（28件）を定義                                             | EX→TC の完全マッピング                                      |
| 2026-03-14 | adopted     | 10_Plan   | 4フェーズ実装計画（共通Protocol→atdd→prototyping→Evidence）を定義            | DR-0009（共通 Protocol 先行）に準拠                         |

## Rejected Decisions

| Date       | Rejected Option                     | Reason                                         | Recurrence Prevention                                                                                 |
| ---------- | ----------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 2026-03-14 | 差分検出を git diff のみに依存      | 単一ソースでは git 不可環境での検出漏れリスク  | DO NOT: 差分検出を単一ソースに依存しない。Temptation: git diff だけで十分だと思う                     |
| 2026-03-14 | verify をインクリメンタル対応       | 品質ゲートの見落としリスクが許容できない       | DO NOT: verify をインクリメンタルにしない。Temptation: 一貫性のため全スキルをインクリメンタル化したい |
| 2026-03-14 | SDP v1 で TypeScript を変更         | ビルド・テスト影響が大きく v1.5.5 に収まらない | DO NOT: SDP v1 で TypeScript を変更しない。Temptation: TS でロジックを実装したい                      |
| 2026-03-14 | Structural 変更で stale 判定        | コメント変更等で過剰な再生成が発生             | DO NOT: Structural 変更で stale 判定しない。Temptation: 安全側に倒して全変更を stale にしたい         |
| 2026-03-14 | policy 変更の影響範囲を自動絞り込み | 解析精度が不十分で漏れリスク                   | DO NOT: policy 変更の影響範囲を自動で絞り込まない。Temptation: 賢く影響範囲を限定したい               |

## Drift Events

| Date | Trigger | Impact Assessment | Files Updated |
| ---- | ------- | ----------------- | ------------- |
| -    | -       | -                 | -             |
