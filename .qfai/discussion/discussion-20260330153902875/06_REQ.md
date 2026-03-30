# 06_REQ

## Requirements Table

| REQ-ID   | Title                                | Description                                                                                                                                                                               | Source                        | Priority | Status |
| -------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------- | ------ |
| REQ-0001 | Canonical validator registration     | `validateProject()` は canonical UIX validator entrypoint を唯一の本線として呼び出すこと                                                                                                  | SRC-0001, SRC-0002 (V179-001) | must     | draft  |
| REQ-0002 | Discussion completion convergence    | UI-bearing project の discussion completion は taste interview、trend scan、3-layer rubric、option comparison、selected anchor、strong contracts を必須にすること                         | SRC-0001, SRC-0002 (V179-004) | must     | draft  |
| REQ-0003 | Canonical UI/UX artifact family      | generated UI/UX templates は legacy 4-axis ではなく `invariant/trend-derived/product-specific/aggregate` の family を canonical default とすること                                        | SRC-0001, SRC-0002 (V179-005) | must     | draft  |
| REQ-0004 | Strong strategy schema               | `10_strategy` は `surface`, `selection_required`, `decision`, `candidate_options`, `chosen_option`, `rationale`, `verification_expectations`, `notes_for_reviewer` を持つこと             | SRC-0001, SRC-0002 (V179-006) | must     | draft  |
| REQ-0005 | Strong screen contract schema        | `40_contracts` は `screen_id`, `route`, `actor`, `purpose`, `primary_tasks`, `required_states`, `transitions`, `observable_outcomes`, `notes_for_verify`, `notes_for_reviewer` を持つこと | SRC-0001, SRC-0002 (V179-006) | must     | draft  |
| REQ-0006 | Static-first prototyping contract    | `/qfai-prototyping` は `low-cost`, `standard`, `full-harness` を定義し、artifact recommends / CLI decides / report records を public contract とすること                                  | SRC-0001, SRC-0002 (V179-002) | must     | draft  |
| REQ-0007 | Full-harness real entrypoint         | `/qfai-prototyping-full-harness` は explicit non-default path として存在し、planner/generator/evaluator/decision-gate phases を持つこと                                                   | SRC-0001, SRC-0002 (V179-003) | must     | draft  |
| REQ-0008 | Honest render evidence orchestration | render evidence は `captured`, `skipped`, `failed` を返し、unsupported environment を fake success にしないこと                                                                           | SRC-0001, SRC-0002 (V179-008) | must     | draft  |
| REQ-0009 | Browser QA real findings             | browser QA runner は smoke / interaction / visual / accessibility の phase runner を接続し、skipped 理由または findings を structured に返すこと                                          | SRC-0001, SRC-0002 (V179-009) | should   | draft  |
| REQ-0010 | Reviewer routing alignment           | reviewer assets は taste reflection、trend freshness、anti-preference traceability、anchor strength、generic fallback risk を semantic review 対象にすること                              | SRC-0001, SRC-0002 (V179-010) | should   | draft  |
| REQ-0011 | Docs normalization                   | steering / changelog / migration docs / comments は implemented, scaffold/foundation, deferred を区別し、矛盾した state claim を残さないこと                                              | SRC-0001, SRC-0002 (V179-011) | should   | draft  |

## Rules

- 各 REQ は少なくとも 1 つの source を持つ。
- `must` は v1.7.9 convergence claim の成立条件、`should` は同 release 内の追従項目とする。
