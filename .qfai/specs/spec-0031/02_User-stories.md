# 02 User Stories

## US Catalog

- US-0031-0001: Premium Mode Opt-In
- US-0031-0002: Planner Phase
- US-0031-0003: Generator Phase
- US-0031-0004: Evaluator Phase with Critique
- US-0031-0005: Iteration Loop Management
- US-0031-0006: Evidence and Review Generation
- US-0031-0007: [v1.7.7 Remediation] Dedicated /qfai-prototyping-full-harness skill entrypoint with explicit skill definition
- US-0031-0008: [v1.7.7 Remediation] Explicit evidence and reviewer policy documented at entrypoint level
- US-0031-0009: [v1.7.7 Remediation] Full-harness mode positioned within three-mode structure (low-cost / standard / full-harness)
- US-0031-0010: [v1.7.7 Remediation] Full-harness invocation from standard skill routing

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

---

## [v1.7.7 Remediation] User Stories

## US-0031-0007: Dedicated /qfai-prototyping-full-harness skill entrypoint

- Parent: CAP-0031
- Source: discussion-20260329195516830, REQ-0002, discussion story 2
- Goal: As a QFAI power user, I want a dedicated `/qfai-prototyping-full-harness` skill with an explicit SKILL.md definition and CLI entrypoint, so that I can opt into premium runtime-heavy validation explicitly when my environment is ready.
- Non-goals: Merging full-harness back into /qfai-prototyping; adding --full-harness flag to standard skill; implementing the standard or low-cost paths (spec-0006 scope)
- Notes: Addresses P0-02 from discussion-20260329195516830. The dedicated entrypoint must exist as a named skill registered in the skill system with its own SKILL.md. The CLI invocation must be `/qfai-prototyping-full-harness` (not a flag or config entry on the standard skill).

### Example Seeds

| Perspective       | Example                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Happy path        | User invokes `/qfai-prototyping-full-harness`; runtime checks execute; structured output returned              |
| Negative path     | Required runtime dependency (e.g., browser) missing; error before loop with install guidance                   |
| Edge/boundary     | Environment has partial runtime support; harness runs available checks, skips unavailable ones                  |
| Permission/role   | User without premium configuration invokes full-harness; guided to configure or fall back to standard          |
| State transition  | Full-harness running -> user cancels -> handoff artifact persists for resumption                                |
| Idempotency/retry | Re-invoking full-harness with same inputs after completion yields consistent results                            |

## US-0031-0008: Explicit evidence and reviewer policy at entrypoint

- Parent: CAP-0031
- Source: discussion-20260329195516830, REQ-0002, REQ-0014
- Goal: As a QFAI power user, I want the /qfai-prototyping-full-harness skill to document its evidence policy and reviewer expectations explicitly at the entrypoint level (SKILL.md and --help output), so that I know exactly what artifacts will be produced and what a reviewer needs to assess the output.
- Non-goals: Auto-routing evidence to reviewers; integrating with external review systems
- Notes: SKILL.md must state: mandatory evidence artifacts (iteration history, scoring trace, decision log), mandatory review summary, termination-reason reporting (accept / cap-reached), and reviewer expectations (what fields to check, what scores to examine).

### Example Seeds

| Perspective       | Example                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Happy path        | Reviewer reads SKILL.md; finds complete evidence policy section and reviewer expectations without needing other docs  |
| Negative path     | Evidence policy section missing from SKILL.md; `qfai validate` flags incomplete skill documentation                  |
| Edge/boundary     | Run terminates with cap-reached; evidence policy documents cap-reached artifact contents and reviewer guidance        |
| Permission/role   | New contributor reads SKILL.md; evidence and reviewer sections are self-contained                                     |
| State transition  | SKILL.md updated from no policy to explicit policy; existing runs' artifacts remain valid against new policy           |
| Idempotency/retry | Reading evidence policy from SKILL.md twice returns identical content                                                |

## US-0031-0009: Full-harness in three-mode structure

- Parent: CAP-0031
- Source: discussion-20260329195516830, REQ-0003, REQ-0010, discussion story 9
- Goal: As a QFAI user, I want the full-harness mode to be clearly positioned as the third tier in the low-cost / standard / full-harness mode structure, with skill docs explicitly stating its evidence level, runtime requirements, and how it relates to the other two modes.
- Non-goals: Implementing low-cost or standard modes (spec-0006 scope); auto-downgrading to standard if environment is incomplete
- Notes: The SKILL.md and --help output for /qfai-prototyping-full-harness must cross-reference the three-mode structure. It must state that this skill is the full-harness tier and direct users to spec-0006/qfai-prototyping for low-cost and standard tiers.

### Example Seeds

| Perspective       | Example                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Happy path        | User reads /qfai-prototyping-full-harness SKILL.md; finds three-mode context section with cross-references      |
| Negative path     | SKILL.md missing three-mode positioning; `qfai validate` flags mode documentation gap                           |
| Edge/boundary     | User invokes full-harness but environment only supports standard; skill explains why and points to standard path |
| Permission/role   | Contributor writing mode docs; three-mode structure is referenced from a single canonical location               |
| State transition  | Mode documentation updated from standalone to three-mode; existing skill invocations unaffected                 |
| Idempotency/retry | Mode documentation reads identically across multiple reads                                                       |

## US-0031-0010: Full-harness invocation from standard skill routing

- Parent: CAP-0031
- Source: discussion-20260329195516830, REQ-0002, REQ-0010
- Goal: As a QFAI user, I want the standard `/qfai-prototyping` skill's `--mode full-harness` routing to correctly direct me to this skill, so that the handoff from standard skill to full-harness skill is seamless and well-documented.
- Non-goals: Implementing the routing logic (spec-0006 scope); auto-invoking full-harness on behalf of the user
- Notes: Full-harness skill must accept invocation seamlessly when the user follows routing guidance from the standard prototyping skill. No environment state from standard skill routing should cause errors in full-harness initialization.

### Example Seeds

| Perspective       | Example                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Happy path        | User follows routing guidance from standard skill; invokes /qfai-prototyping-full-harness; premium loop starts       |
| Negative path     | User follows routing guidance but environment lacks required deps; full-harness emits structured pre-loop error       |
| Edge/boundary     | User manually invokes /qfai-prototyping-full-harness without going through routing; skill works identically           |
| Permission/role   | N/A (CLI executor role only)                                                                                         |
| State transition  | Standard skill routing -> full-harness invocation; no state leakage from routing context                             |
| Idempotency/retry | Invoking full-harness multiple times with same inputs produces consistent initialization and loop behavior            |
