# 02 User Stories

## US Catalog

- US-0031-0001: Premium Mode Opt-In
- US-0031-0002: Planner Phase
- US-0031-0003: Generator Phase
- US-0031-0004: Evaluator Phase with Critique
- US-0031-0005: Iteration Loop Management
- US-0031-0006: Evidence and Review Generation

## US-0031-0001: Premium Mode Opt-In

- Parent: CAP-0031
- Source: discussion-20260329-CAP-0031, REQ-0011
- Goal: QFAI user として、`/qfai-prototyping-full-harness` を明示的に呼び出すことで premium prototyping mode に入りたい。standard path を意図せず変更せず、premium mode の全機能（planner/generator/evaluator loop, evidence, review）を利用するため。
- Non-goals: standard path に premium 機能を混入させること、フラグやオプションによる暗黙的な premium mode 有効化
- Notes: SD-0031-001 (DR-0077) に基づき premium path は別 skill として実装。standard path との分離が NFR-0005 を担保する鍵。

### Example Seeds

| Perspective         | Example                                                                                           | Status |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Happy path          | User invokes /qfai-prototyping-full-harness with valid spec inputs; premium loop initiates        | seed   |
| Negative path       | User invokes /qfai-prototyping-full-harness without required spec inputs; clear error before loop | seed   |
| Edge / boundary     | User invokes standard /qfai-prototyping; no premium features activate                             | seed   |
| Permission / role   | N/A: CLI executor role only                                                                       | seed   |
| State transition    | Standard path -> premium path invocation; no state leakage between paths                          | seed   |
| Idempotency / retry | Re-invoking /qfai-prototyping-full-harness with same inputs produces consistent initialization    | seed   |

## US-0031-0002: Planner Phase

- Parent: CAP-0031
- Source: discussion-20260329-CAP-0031, REQ-0012
- Goal: Premium mode 実行時に、planner が spec inputs と context を分析し、generation strategy（approach, constraints, iteration budget allocation）を produce したい。generator が明確な計画に基づいて output を生成できるため。
- Non-goals: planner が直接 code を生成すること、planner output が evidence に含まれること（evidence は最終出力のみ）
- Notes: Planner output は generator への structured input となる。pivot decision 時に planner が re-invoked される。

### Example Seeds

| Perspective         | Example                                                                                  | Status |
| ------------------- | ---------------------------------------------------------------------------------------- | ------ |
| Happy path          | Planner analyzes spec inputs, produces strategy with approach and constraints            | seed   |
| Negative path       | Planner receives malformed spec inputs; returns structured error before generator starts | seed   |
| Edge / boundary     | Minimal spec inputs (bare minimum fields); planner produces conservative strategy        | seed   |
| Permission / role   | N/A                                                                                      | seed   |
| State transition    | Initial plan -> pivot triggers replan; new strategy replaces previous                    | seed   |
| Idempotency / retry | Same spec inputs produce structurally consistent (not necessarily identical) plans       | seed   |

## US-0031-0003: Generator Phase

- Parent: CAP-0031
- Source: discussion-20260329-CAP-0031, REQ-0012
- Goal: Planner output を受け取った generator として、plan に従って prototyping output（code, configuration, artifacts）を produce したい。evaluator が scoring 可能な structured output を得るため。
- Non-goals: generator が自己評価すること、generator が直接 iteration control を行うこと
- Notes: Refine decision 時に evaluator feedback を加味した再 generation を行う。

### Example Seeds

| Perspective         | Example                                                                 | Status |
| ------------------- | ----------------------------------------------------------------------- | ------ |
| Happy path          | Generator receives plan, produces output conforming to plan constraints | seed   |
| Negative path       | Generator receives empty plan; returns structured error                 | seed   |
| Edge / boundary     | Plan specifies minimal constraints; generator produces baseline output  | seed   |
| Permission / role   | N/A                                                                     | seed   |
| State transition    | Initial generation -> refine feedback -> improved generation            | seed   |
| Idempotency / retry | Same plan and feedback produce structurally consistent output           | seed   |

## US-0031-0004: Evaluator Phase with Critique

- Parent: CAP-0031
- Source: discussion-20260329-CAP-0031, REQ-0012, REQ-0015
- Goal: Generator output を受け取った evaluator として、calibration pack (spec-0030) と optional critique adapter (spec-0029) を使って weighted scoring を行い、accept/refine/pivot の decision を produce したい。iteration loop の進行制御に必要な structured judgment を提供するため。
- Non-goals: evaluator が output を修正すること、critique 結果を hard gate にすること
- Notes: Weighted scoring は dimension floors を持つ (REQ-0015)。critique adapter は fail-open (spec-0029)。calibration pack は scoring baseline を提供 (spec-0030)。

### Example Seeds

| Perspective         | Example                                                                             | Status |
| ------------------- | ----------------------------------------------------------------------------------- | ------ |
| Happy path          | Evaluator scores output above thresholds; emits accept decision                     | seed   |
| Negative path       | Evaluator encounters critique adapter failure; continues with fail-open scoring     | seed   |
| Edge / boundary     | Score meets overall threshold but one dimension below floor; refine decision forced | seed   |
| Permission / role   | N/A                                                                                 | seed   |
| State transition    | First evaluation -> refine -> second evaluation -> accept                           | seed   |
| Idempotency / retry | Same output and calibration produce consistent scoring (within critique variance)   | seed   |

## US-0031-0005: Iteration Loop Management

- Parent: CAP-0031
- Source: discussion-20260329-CAP-0031, REQ-0013
- Goal: Premium mode user として、iteration loop が 5-15 回の範囲で configurable max cap を持ち、accept/refine/pivot decisions に応じて適切に制御されるようにしたい。無限ループを防ぎつつ convergence opportunity を確保するため。
- Non-goals: iteration 回数の自動最適化、iteration ごとの cost tracking（deferred）
- Notes: Default max は 15 iterations (SD-0031-003, DR-0073)。最小 iteration 数 5 は evaluator が accept を出しても保証されるわけではなく、loop が 5 未満で accept に到達した場合は即座に終了する。5 は configurable range の下限であり、実行保証最小値ではない。

### Example Seeds

| Perspective         | Example                                                                     | Status |
| ------------------- | --------------------------------------------------------------------------- | ------ |
| Happy path          | Loop runs 8 iterations, evaluator accepts at iteration 8; output emitted    | seed   |
| Negative path       | Loop reaches max cap (15); output emitted with cap-reached status           | seed   |
| Edge / boundary     | Evaluator accepts at iteration 1; loop exits immediately with accept status | seed   |
| Permission / role   | N/A                                                                         | seed   |
| State transition    | refine -> refine -> pivot (replan) -> refine -> accept                      | seed   |
| Idempotency / retry | Same inputs and max cap produce consistent loop termination behavior        | seed   |

## US-0031-0006: Evidence and Review Generation

- Parent: CAP-0031
- Source: discussion-20260329-CAP-0031, REQ-0014
- Goal: Premium mode user として、every premium run が evidence artifacts と review summary を生成するようにしたい。prototyping 品質を後から検証可能にし、review プロセスに必要な情報を提供するため。
- Non-goals: evidence の自動品質判定を hard gate にすること、review summary の自動承認
- Notes: Evidence は iteration history, final scoring, decision trace を含む。review summary は human reviewer 向けの structured output。accept でも cap-reached でも必ず生成される。

### Example Seeds

| Perspective         | Example                                                                                        | Status |
| ------------------- | ---------------------------------------------------------------------------------------------- | ------ |
| Happy path          | Premium run completes with accept; evidence and review artifacts generated                     | seed   |
| Negative path       | Premium run hits cap; evidence and review artifacts still generated with cap-reached status    | seed   |
| Edge / boundary     | Premium run with single iteration accept; evidence contains minimal but complete iteration log | seed   |
| Permission / role   | N/A                                                                                            | seed   |
| State transition    | Loop active -> terminal decision -> evidence generation -> review generation                   | seed   |
| Idempotency / retry | Re-run produces new evidence/review artifacts (not overwriting previous run)                   | seed   |
