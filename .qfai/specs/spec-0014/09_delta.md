# 09 Delta

## Adopted

| ID | Date | Change | Rationale | Impact |
|---|---|---|---|---|
| DELTA-001 | 2026-03-17 | spec-0014 新規作成（CAP-0014: 実装フェーズ統一） | discussion-20260317102145554 の設計決定を仕様化 | 全ファイル新規（01_Spec〜10_Plan） |

## Rejected

| ID | Date | Proposal | Rejection Reason | DO NOT | Temptation |
|---|---|---|---|---|---|
| REJ-001 | 2026-03-17 | 旧スキルを非推奨にして段階移行 | 半移行状態が混乱を招く（DR-0013） | DO NOT: 旧スキルを非推奨状態で残さない | 段階的移行が安全だと思う |
| REJ-002 | 2026-03-17 | test-list.md を spec ディレクトリ外に配置 | 発見性の低下とバリデータアクセスの複雑化（DR-0014） | DO NOT: test-list.md を spec ディレクトリ外に配置しない | tdd/ を独立ディレクトリにしたい |
| REJ-003 | 2026-03-17 | Phase 1 でフルバリデーション（カバレッジ含む）を実施 | v1.6.0 のスコープ超過（DR-0015） | DO NOT: Phase 1 でコンテンツバリデーションを含めない | 一度に全て検証したい |
| REJ-004 | 2026-03-17 | 全件並列実行のサポート | 共有状態がある場合の状態破損リスク（DR-0016） | DO NOT: 共有状態があるスライスを並列実行しない | 全件並列で高速化したい |

## Drift

| ID | Date | Original Direction | New Direction | Impact Assessment | Files Updated |
|---|---|---|---|---|---|
| — | — | 0 items | — | — | — |
