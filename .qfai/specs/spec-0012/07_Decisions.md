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

- Decision: `executionPlan`, `screenshotDir`, Lighthouse gate, designSystemCompliance, calibration override validators は互換/reference slice として残してよい。
- Rationale: 既存テストと artifact contract を維持しつつ、runtime orchestration を復活させないため。

## DR-0012-0005: Historical Full-Harness Narrative Superseded

- Decision: 過去の `full-harness` / mode / runtime decisions は historical context としてのみ保持し、active execution contract には使わない。
- Rationale: 旧議論の追跡は残しつつ、現行 SSOT を skill-first posture に一本化するため。
