# 12_OQ-Resolution-Log

## Resolution Log

### OQ-0001: Default max iteration count for full-harness loops

- **Resolution Date**: 2026-03-29
- **Decision**: (B) 15 iterations as default max
- **Rationale**: 15 iterations provides sufficient refinement cycles for meaningful quality improvement while keeping cost and time within acceptable bounds. The value is configurable via `qfai.config.yaml` and CLI `--max-iterations` flag for projects that need more or fewer cycles.
- **Rejected Options**: (A) 10 iterations - too few for complex prototyping tasks to converge. (C) 20 iterations - diminishing returns beyond 15; cost increases linearly while quality gains plateau.

### OQ-0002: Plateau detection policy

- **Resolution Date**: 2026-03-29
- **Decision**: (A) Score delta threshold with 3-iteration lookback
- **Rationale**: Score delta is directly measurable and objective. A 3-iteration lookback window smooths noise while detecting genuine plateaus. If the maximum score delta across the last 3 iterations falls below a configurable threshold, the loop exits early.
- **Rejected Options**: (B) Consecutive no-improvement count - binary pass/fail loses granularity. (C) Combined approach - adds complexity without clear benefit over delta-only.

### OQ-0003: Provider benchmarking and fallback choice

- **Deferred**: 2026-03-29
- **Reason**: Cannot benchmark providers without a concrete provider interface implementation. The critique adapter interface must be designed first.
- **Candidates**: Static priority list, latency-based dynamic selection, quality-score-based selection.
- **Next Decision Point**: SDD phase when provider interface is concrete.

### OQ-0004: Reviewer disagreement escalation policy

- **Deferred**: 2026-03-29
- **Reason**: Escalation policy depends on how calibration scoring and reviewer weighting are structured. Premature to decide before calibration pack design is complete.
- **Candidates**: Simple majority rule, weighted by reviewer confidence, escalate to human.
- **Next Decision Point**: SDD phase after calibration pack design.

### OQ-0005: Premium path cost ceilings by project class

- **Deferred**: 2026-03-29
- **Reason**: No baseline observability data exists yet. Meaningful cost ceilings require real usage data from initial full-harness runs.
- **Candidates**: Fixed ceiling per class, percentage of estimated total, user-defined per project.
- **Next Decision Point**: Post-implementation tuning with real data.

### OQ-0006: Fail-open behavior scope

- **Resolution Date**: 2026-03-29
- **Decision**: (A) Fail open at adapter level only
- **Rationale**: Adapter-level fail-open keeps the failure boundary tight. If a critique provider fails, the adapter returns a neutral/empty critique and the harness loop continues without that provider's input. This prevents a single provider failure from cascading to halt the entire harness.
- **Rejected Options**: (B) Full-harness level fail-open - too broad; masks structural failures. (C) Configurable per-component - over-engineering for initial release.

### OQ-0007: Display-only vs stub-only detection threshold

- **Resolution Date**: 2026-03-29
- **Decision**: (A) Heuristic-based with configurable sensitivity
- **Rationale**: Heuristic-based detection (pattern matching on common display-only and stub-only indicators) provides sufficient accuracy for initial release. AST parsing would add significant complexity and a parser dependency without proportional detection improvement.
- **Rejected Options**: (B) AST-based - heavy dependency, complexity disproportionate to benefit. (C) Hybrid - unnecessary for v1.7.6; can upgrade to hybrid in future if heuristic proves insufficient.
