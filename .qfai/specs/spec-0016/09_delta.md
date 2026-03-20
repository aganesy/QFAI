# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-20
- Primary: Behavior
- Tags: v1.6.2, qfai-implement, sub-agent-roster, completion-contract, evidence-contract, parallel-dispatch
- Summary: spec-0016 新規作成。v1.6.2 qfai-implement の実装設計を仕様化。サブエージェントロスター形式化、完了コントラクト・エビデンスコントラクト堅牢化、並列ディスパッチルール策定、docs/wrappers/assets 同期ルールを含む。

## Rationale

- v1.6.1 で導入したガードレール強化（Phase 2 バリデータ）に続き、v1.6.2 では qfai-implement の実行構造そのものを形式化する。サブエージェントの役割・責務・呼び出し順序を明文化し、完了判定・エビデンス記録・並列実行の契約を確立することで、AI エージェントによる自律的な実装フェーズの再現性と検証可能性を高める。

## Candidates Considered

1. サブエージェントロスターを非形式的な内部実装として扱う（不採用）
2. エビデンス形式を厳格 JSON スキーマで即時導入（不採用）
3. バリデータ警告をハードエラーとして扱う（不採用）
4. 自由文+明示ラベル形式のエビデンスと非ブロッキング警告を採用し、段階的に強化（採用）

## Adopted

### D-001: Sub-agent roster formalization（6 named agents with responsibilities）

- Why: SRC-0001 に基づき、サブエージェントの役割・呼び出し順序・責務を明文化することで、実装フェーズの再現性と追跡可能性を確保する
- Evidence: discussion-20260320000941109 adopted section

### D-002: Completion contract（10-point item checklist + spec conditions + prohibition）

- Why: SRC-0001 に基づき、各フェーズの完了を構造的に検証可能にする。10 項目チェックリスト・仕様条件・禁止事項の三層構造で完了詐称を防止する
- Evidence: discussion-20260320000941109 adopted section

### D-003: Evidence contract（command+result pairs, free-text+labels format）

- Why: SRC-0001 S6.2 に従い、v1.6.2 では自由文+ラベル形式を採用。コマンド+結果ペアを必須とし、将来バージョンで厳格 JSON へ段階的移行する
- Evidence: discussion-20260320000941109 OQ-0001 → DEC-0016-001

### D-004: Parallel dispatch rules（independent slices, worktree separation, integration verify）

- Why: SRC-0001 S7.1, S7.3 に基づき、並列実行時の競合防止を保証する。独立スライス分割・ワークツリー/ブランチ分離・統合検証を必須とする
- Evidence: discussion-20260320000941109 OQ-0003 → DEC-0016-003

### D-005: Docs/wrappers/assets sync（required/forbidden phrases, asset tests）

- Why: SRC-0001 S10.1 に基づき、ラッパー記述と実装の乖離を防止する。必須フレーズ・禁止フレーズの明文化と asset テストの追加で乖離を自動検出する
- Evidence: discussion-20260320000941109 OQ-0004, OQ-0005 → DEC-0016-004, DEC-0016-005

### D-006: Evidence format = free-text+labels（from OQ-0001）

- Why: 自由文+明示ラベル形式は v1.6.2 のスコープ内で十分な構造性と柔軟性を両立する。厳格 JSON は v1.6.3+ に延期
- Evidence: DEC-0016-001

### D-007: Validator warnings = non-blocking（from OQ-0002）

- Why: SRC-0001 S9 の "warning or non-blocking diagnostic" に従う。オプション診断でブロックするとリリースが遅延する
- Evidence: DEC-0016-002

### D-008: Parallel isolation = worktree required（from OQ-0003）

- Why: ワークツリーまたは明示的なブランチ分離を必須とする。無分離オプションを拒否することで、デフォルト安全（default-deny parallelism）を実現する
- Evidence: DEC-0016-003

## Rejected

### R-001: Evidence JSON schema（厳格 JSON スキーマの即時導入）

- Reason: v1.6.2 では自由文+明示ラベルで十分。厳格 JSON は将来バージョンに延期。SRC-0001 S6.2 に明記
- DO NOT: v1.6.2 で厳格 JSON スキーマを導入しない
- Temptation: 構造化を急いで自由文の柔軟性を失いたくなる

### R-002: Hard error validators（バリデータ警告のハードエラー化）

- Reason: v1.6.2 では warnings only。ハードエラーは将来バージョンで段階導入。SRC-0001 S9 に明記
- DO NOT: v1.6.2 でバリデータ警告をハードエラーにしない
- Temptation: 厳格な検証のためにハードエラーにしたくなる

### R-003: Coverage numerical targets（カバレッジ数値目標の設定）

- Reason: v1.6.2 のスコープ外。カバレッジ数値目標は別途検討が必要であり、本リリースでは対象外
- DO NOT: v1.6.2 でカバレッジ数値目標を定義しない
- Temptation: 品質保証のために具体的な数値を設定したくなる

## Drift

None recorded.

## Recurrence Prevention

None needed.

## Impact

- Affects: packages/qfai/src/core/implement/, packages/qfai/assets/init/.qfai/assistant/instructions/, docs/, .github/
- Validation: qfai validate, pnpm test, verify-pack, wrapper phrase checks

## Follow-ups

- /qfai-implement または /qfai-atdd で実装フェーズに進む
- Owner: user
- Due: v1.6.2 release
