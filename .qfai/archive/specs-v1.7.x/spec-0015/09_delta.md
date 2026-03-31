# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-17
- Primary: Behavior
- Tags: v1.6.1, guardrail-hardening, phase-2-validator
- Summary: spec-0015 新規作成。v1.6.1 ガードレール強化のための Phase 2 バリデータ、Report Coverage、Template/Docs 更新を仕様化。

## Rationale

- v1.6.0 で導入した test-list.md の構造検証（Phase 1）に加え、コンテンツ検証（Phase 2）を追加して coverage 抜けと completion 詐称を防止する。

## Candidates Considered

1. Phase 2 チェックを warning で導入し段階的に error 化
2. Phase 2 チェックを最初から error で導入（採用）
3. Phase 2 を v1.6.2 に延期し v1.6.1 は template/docs のみ

## Adopted

### D-001: Test file path = project root relative (DR-0017)

- Why: 言語非依存のファイル存在チェック、ビルドツール仮定を排除
- Evidence: discussion-20260317153106326 OQ-0001

### D-002: DR-ID + Evidence = required columns (DR-0018)

- Why: completion 詐称防止、例外の追跡可能性確保
- Evidence: discussion-20260317153106326 OQ-0002

### D-003: TC Layer = 06_Test-Cases.md Level column (DR-0019)

- Why: テスト可能レイヤーにスコープ限定、false positive 回避
- Evidence: discussion-20260317153106326 OQ-0003

### D-004: TDDLIST_INVALID_ID in v1.6.1 (DR-0020)

- Why: 不正 ID の早期検出、下流伝播防止
- Evidence: discussion-20260317153106326 OQ-0004

### D-005: All Phase 2 checks = error severity (DR-0021)

- Why: warning は無視されうる、guardrail として不十分
- Evidence: discussion-20260317153106326 design decisions

## Rejected

### R-001: Test file path を spec ディレクトリ相対にする

- Reason: spec 外テストファイルを参照できない
- DO NOT: テストファイルパスを spec ディレクトリ相対にしない
- Temptation: spec スコープに閉じたい

### R-002: Evidence 列を任意にする

- Reason: evidence なしでは例外検証が不完全
- DO NOT: Evidence 列を任意にしない
- Temptation: 列数を最小限にしたい

### R-003: TC Layer を test-list.md から判定する

- Reason: test-list.md は実行台帳、TC 定義の SSOT ではない
- DO NOT: TC Layer（Level 判定）を test-list.md の Layer 列から行わない
- Temptation: test-list.md だけで完結させたい

### R-004: ID フォーマット検証を v1.6.2 に延期

- Reason: 不正 ID 伝播リスクが v1.6.1 内で顕在化
- DO NOT: ID フォーマット検証を延期しない
- Temptation: スコープを絞りたい

### R-005: Phase 2 チェックを warning にする

- Reason: warning は無視されうる、guardrail として不十分
- DO NOT: Phase 2 チェックを warning にしない
- Temptation: 移行負荷を下げたい

## Impact

- Affects: packages/qfai/src/core/validators/tddList.ts, packages/qfai/src/core/report.ts, packages/qfai/assets/init/.qfai/specs/, tests/, scripts/verify-pack.mjs
- Validation: qfai validate --fail-on error, pnpm test, verify-pack

## Follow-ups

- /qfai-prototyping or /qfai-atdd で実装フェーズに進む
- Owner: user
- Due: v1.6.1 release
