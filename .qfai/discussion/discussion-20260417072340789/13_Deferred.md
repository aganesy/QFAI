# 13_Deferred — 延期 OQ 詳細

## Deferred Items

| OQ-ID   | Title                                                                         | Gate | Deferred-Reason                                                                                                   | Deferred-Until                                                                                   | Owner | Due        | Severity | Impact                                         | Mitigation                                                                                                                | Evidence                              |
| ------- | ----------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----- | ---------- | -------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| OQ-0001 | `PerSpecCoverage` 型の dead fields（`apiEndpoints`/`dbObjects`）の扱い        | sdd  | 実装詳細であり REQ-0005/REQ-0006 の達成を妨げない。コード精査が必要であり SDD フェーズが適切な判断時点。           | SDD フェーズ開始時に specCoverage.ts・型定義を直接確認した後に決定される                           | agent | sdd 開始時 | low      | spec/implementation (型定義・テストへの軽微な影響) | 現状の 0/empty 返却で機能的問題はない。SDD フェーズで削除または維持を明示的に決定するまでは現状維持。                       | delivery-planner preflight assessment |
| OQ-0004 | `specCoverage.test.ts` / `refSemantics.test.ts` の新規作成 vs 既存拡張の判断 | tdd  | 設計書が「新規または既存拡張」と記載。実際のファイル存在確認なしに判断できず、TDD フェーズでの実装着手時が適切。   | TDD フェーズ開始時に `packages/qfai/tests/core/prototyping/` ディレクトリを確認し判断が下された後 | agent | tdd 開始時 | low      | tests (テストファイルの作成方針に影響)          | DoD 5-3/5-4 の達成は確定している（ファイルが存在する/しないに関わらず最終的にテストは揃う）。判断はプロセスの問題のみ。     | SRC-0001 sec.7-8/7-9                  |

## Validation Rules

- Every deferred item in `11_OQ-Register.md` must have a corresponding row here.
- All 11 columns are mandatory for every row.
- `Severity`: `high`, `medium`, `low`.
- `Deferred-Until` must define when and by what signal re-evaluation happens.
