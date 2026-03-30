# 05_Scope

## In Scope

- V179-001: main validate pipeline への canonical UIX validators 統合
- V179-002: `qfai-prototyping` の static-first / mode-aware rewrite
- V179-003: `/qfai-prototyping-full-harness` の user-facing path 定義
- V179-004: `qfai-discussion` の taste/trend/3-layer architecture への収束
- V179-005: canonical UI/UX sidecar family への置換
- V179-006: `10_strategy` / `40_contracts` の強化 schema
- V179-007: `04_Sources.md` の trend/translation wiring
- V179-008: render evidence の real orchestration
- V179-009: browser QA runner の real findings 化
- V179-010: reviewer routing の canonical field 追従
- V179-011: docs / steering / changelog / migration normalization

## Out of Scope

- full-harness を default mode にすること
- semantic design quality を deterministic validator へ押し込むこと
- critique/calibration science の最適化
- v1.7.9 と無関係な新 feature ideation

## Anti-goals

- architecture を再議論して release を遅延させない
- 実装されていない evidence/QA capability を release notes で完成扱いしない
- legacy assets を説明なしに hard break しない

## Success Criteria

1. P0 と release-blocking P1 が scope 内で明示される。
2. open OQ が 0 で、deferred も 0 または完全 metadata 付きで管理される。
3. `/qfai-sdd` が参照できる REQ/NFR/constraints/policy が揃う。
4. review pack が PASS で閉じる。

## Release Gate Mapping

| Issue         | Priority | Release Gate     |
| ------------- | -------- | ---------------- |
| V179-001      | P0       | yes              |
| V179-002      | P0       | yes              |
| V179-003      | P0       | yes              |
| V179-004      | P1       | release-blocking |
| V179-005      | P1       | release-blocking |
| V179-006      | P1       | release-blocking |
| V179-007..011 | P1/P2    | supporting       |
