# 99_delta

## Change Log

| DL-ID  | Date       | Change Type | Affected Files | Description                                                                                | Rationale                                                       |
| ------ | ---------- | ----------- | -------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| DL-001 | 2026-03-30 | Initial     | All 15 files   | v1.7.8 discussion pack 初版作成。v1.7.7 Gap Analysis (20 gaps) から 14 deliverables を導出 | v1.7.7 → canonical architecture 収束のための correction release |

## Adopted Decisions

| Decision ID | Description                                                 | Rationale                                          | OQ Ref  |
| ----------- | ----------------------------------------------------------- | -------------------------------------------------- | ------- |
| AD-001      | Full-harness: CLI + skill 両方の entrypoint                 | 実行パスと guidance の両方が必要                   | OQ-0001 |
| AD-002      | Browser QA MVP: smoke + visual の 2 phase                   | MVP scope と明示、interaction/accessibility は後続 | OQ-0002 |
| AD-003      | 4-axis → 3-layer: v1.7.8 warning, v1.8.0 error              | 段階的移行で既存ユーザーを壊さない                 | OQ-0003 |
| AD-004      | Weak strategy: v1.7.8 warning, v1.8.0 error                 | Migration window 内は upgrade guidance で対応      | OQ-0004 |
| AD-005      | External critique/calibration: docs + entrypoint のみ公開   | 内部実装の premature expose を避ける               | OQ-0005 |
| AD-006      | Render evidence 不可時: skipped + reason + alternative      | Honest reporting + 実用的 recovery                 | OQ-0006 |
| AD-007      | Anti-preference: taste → axes → review の 3 point traceable | 全フロー横断は scope 過大、重要 3 point に集中     | OQ-0007 |
| AD-008      | Master convergence doc: 新規 steering document              | 既存ファイル拡張より独立ドキュメントが明確         | OQ-0008 |

## Rejected Options

| Rejected ID | Description                                     | Rationale                                                  | Recurrence Prevention                                     |
| ----------- | ----------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| RJ-001      | Full-harness を CLI subcommand のみで提供       | Skill guidance なしでは premium path の期待値が伝わらない  | D-09 で両方の entrypoint を必須化                         |
| RJ-002      | Browser QA 全 4-phase を v1.7.8 scope に含める  | Advanced heuristics は MVP scope 外                        | D-11 acceptance criteria で smoke + visual minimum を明示 |
| RJ-003      | 4-axis を v1.7.8 で即 error                     | Migration window なしは既存 adopters に breaking           | D-03 / REQ-0007 で migration window ポリシーを制度化      |
| RJ-004      | Anti-preference 全フロー横断 traceable (v1.7.8) | Scope 過大。taste → axes → review で十分な v1.7.8 coverage | REQ-0029 を should で定義、v1.8.0+ で拡張検討             |

## Drift Events

0 items — 本ディスカッション中に scope drift は発生していない。
