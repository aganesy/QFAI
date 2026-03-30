# 99_delta

## Change Log

| DL-ID  | Date       | Change Type | Affected Files | Description                                   | Rationale                                                       |
| ------ | ---------- | ----------- | -------------- | --------------------------------------------- | --------------------------------------------------------------- |
| DL-001 | 2026-03-30 | Initial     | All 15 files   | v1.7.9 convergence discussion pack 初版を作成 | design spec と issue register を `/qfai-sdd` 入力へ変換するため |

## Adopted Decisions

| Decision ID | Description                                                          | Rationale                                                               | OQ Ref  |
| ----------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------- |
| AD-001      | v1.7.9 を convergence/correction/integration release と定義          | architecture 再議論を避け、truthful implementation scope に集中するため | OQ-0001 |
| AD-002      | production validate path を canonical validator entrypoint へ統一    | isolated validator と実運用 enforcement の乖離を解消するため            | OQ-0002 |
| AD-003      | discussion completion を taste/trend/3-layer model へ収束            | canonical field family を downstream に引き継ぐため                     | OQ-0003 |
| AD-004      | full-harness を explicit non-default の real user-facing path とする | premium path の期待値と責務を明確化するため                             | OQ-0004 |
| AD-005      | runtime evidence は explicit skipped/failed を返す                   | false success を防ぐため                                                | OQ-0005 |
| AD-006      | docs state claim は maturity vocabulary を統一                       | release communication の矛盾を防ぐため                                  | OQ-0007 |

## Rejected Options

| Rejected ID | Description                                        | Rationale                                              | Recurrence Prevention                               |
| ----------- | -------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| RJ-001      | v1.7.9 を greenfield redesign として扱う           | convergence release の目的から逸脱し、scope が膨張する | issue register ベースで scope を固定する            |
| RJ-002      | legacy 4-axis を canonical default として残す      | validator/template/reviewer の field split が継続する  | 3-layer artifact family を canonical default にする |
| RJ-003      | unsupported runtime capability を success 扱いする | honest evidence principle に反する                     | `captured / skipped / failed` の 3 状態を固定する   |

## Drift Events

0 items — 本ディスカッション中に scope drift は発生していない。
