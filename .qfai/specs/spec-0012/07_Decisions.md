# 07 Decisions

## DR-0012-0001: Skill-Only Public Interface

- Decision: prototyping の public interface は `/qfai-prototyping [--auto]` のみとする。
- Rationale: orchestration を skill に集約し、CLI/runtime surface の複雑性を除去する。

## DR-0012-0002: Mechanical Gate Moves To Validate / Verify

- Decision: 機械的評価は `qfai validate` と `/qfai-verify` が担う。
- Rationale: schema/evidence gate を deterministic に保ちつつ、実評価は skill/sub-agent に委譲するため。

## DR-0012-0003: Mandatory Screenshot + HTML Evidence

- Decision: declared screen ごとに screenshot と HTML snapshot の両方を mandatory evidence とする。
- Rationale: 見た目評価のブレを許容しても、入力 evidence の揃い方だけは機械的に担保するため。

## DR-0012-0004: Legacy Validator Slice Retained Without Runtime Revival

- Decision: `executionPlan`, Lighthouse gate, `designSystemCompliance`, calibration override validators は互換/reference slice として残してよい。
- Rationale: 既存テストと artifact contract を維持しつつ、runtime orchestration を復活させないため。

## DR-0012-0005: Historical Runtime Narrative Superseded

- Decision: 過去の runtime-heavy wording は historical context としてのみ保持し、active execution contract には使わない。
- Rationale: 旧議論の追跡は残しつつ、現行 SSOT を skill-first posture に一本化するため。

## DR-0012-0006: Reviewer-Score Evidence Model

- Decision: full-harness iteration evidence は `reviewerScores[]` と `allReviewerAxesPerfect100` を中心に記録する。
- Rationale: reviewer ごとの根拠と証跡を残しつつ、weighted-total dependence を解消するため。

## DR-0012-0007: Snapshot-Based Scoring Trace

- Decision: `scoringTrace[]` は iteration ごとの snapshot summary とし、`minScore` / `averageScore` / `allReviewerAxesPerfect100` を保持する。
- Rationale: convergence と best-iteration 判定を reviewer-score model に合わせるため。

## DR-0012-0008: Budget-Driven Termination

- Decision: termination は `allReviewerAxesPerfect100` 達成でのみ `converged`、未達のまま予算上限に達したら rework/revise とする。

### DR-0012-0009: Perfect 100 Completion Gate

- Decision: prototyping completion requires every reviewer sub-agent to score every evaluation axis at 100.
- Context: repeated full-harness runs reached the previous 95-point border within a few iterations, making the completion gate too lenient.
- Consequence: 95-point completion wording, variables, and validator paths are replaced by perfect-100 completion semantics.
- Rationale: current history/result writer 実装と一致させるため。

## Absorbed Legacy Decision Registry

The following decision IDs remain valid after removing `spec-0017/` and
`spec-0018/`. They are preserved here so existing references continue to
resolve without keeping separate spec directories alive.

### Former spec-0017 decisions (absorbed)

| Legacy DEC    | Preserved decision                                                                          |
| ------------- | ------------------------------------------------------------------------------------------- |
| DEC-0017-0001 | Mode differences remain limited to `maxCycles`.                                             |
| DEC-0017-0002 | Playwright CLI remains the sole standard browser tool.                                      |
| DEC-0017-0003 | AI evaluator sub-agents remain responsible for visual judgment.                             |
| DEC-0017-0004 | `PrototypingCycleEvidence` remains the active retained cycle schema name.                   |
| DEC-0017-0005 | Package-internal prototyping CLI helpers remain artifact generators rather than evaluators. |
| DEC-0017-0006 | Legacy config keys remain rejected rather than silently aliased.                            |
| DEC-0017-0007 | Lighthouse remains optional auxiliary evidence rather than a universal completion gate.     |
| DEC-0017-0008 | `primaryTasks` remain natural-language interaction notes in command plans.                  |
| DEC-0017-0009 | Runtime `.qfai/` and packaged init assets remain synchronized.                              |
| DEC-0017-0010 | Breaking changes remain acceptable when needed to preserve prototyping invariants.          |

### Former spec-0018 decisions (absorbed)

| Legacy DEC    | Preserved decision                                                                      |
| ------------- | --------------------------------------------------------------------------------------- |
| DEC-0018-0001 | The funnel remains fixed to rounds `r5`, `r3`, `r2`, `r1`.                              |
| DEC-0018-0002 | Dropped candidates remain inspectable and harvestable through retained round artifacts. |
| DEC-0018-0003 | Concept coherence remains a first-class blocking gate.                                  |
| DEC-0018-0004 | Candidate routes remain path-based.                                                     |
| DEC-0018-0005 | Harvested elements may not disappear silently during absorption.                        |
| DEC-0018-0006 | Legacy cycle-era assumptions remain rejected without silent compatibility aliases.      |
| DEC-0018-0007 | Strength taxonomy remains owned by the rubric contract.                                 |
| DEC-0018-0008 | Absorption policy remains its own contract surface.                                     |

## DR-0012-0010: Former Prototyping Specs Are Absorbed Into spec-0012

- Decision: `spec-0017/` and `spec-0018/` are removed after their still-relevant identifiers and behaviors are absorbed into `spec-0012`.
- Rationale: the implementation is authoritative, and the repository should expose a single active prototyping spec pack instead of three overlapping ones.
