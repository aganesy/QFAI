# 07 Decisions

## Decisions

- 3 decisions in this spec.

### SD-0029-001: Provider interface uses generic command pattern

- Decision: Critique providers connect via generic command interface, not HTTP-only
- Rationale: Generic command allows local scripts, Docker containers, and remote services equally
- Rejected: HTTP-only interface (excludes local script providers)
  - DO NOT: Limit provider interface to HTTP. Temptation: HTTP is the most common protocol

### SD-0029-002: Static priority list for provider fallback (interim)

- Decision: Use static config-based priority list for provider selection/fallback (OQ-0003 interim resolution)
- Rationale: Dynamic selection requires benchmark data that doesn't exist yet. Static list is sufficient for initial release
- Rejected: Dynamic latency-based selection (no baseline data available)
  - DO NOT: Implement dynamic provider selection without benchmark data. Temptation: Want optimal provider automatically

### SD-0029-003: Adapter-level fail-open boundary

- Decision: Fail-open is scoped to adapter level only (DR-0075)
- Rationale: Tight failure boundary prevents cascade failures in the harness loop
- Rejected: Full-harness level fail-open (too broad, masks real issues)
  - DO NOT: Expand fail-open beyond adapter boundary. Temptation: Broader protection seems safer

### SD-0029-004: 3-layer evaluation model convergence (v1.7.6 Remediation)

- Decision: Converge critique adapter evaluation architecture to the 3-layer model (invariant, trend-derived, product-specific) as mandated by DR-0080
- Rationale: The steering documents define 3-layer as the agreed final architecture. The legacy 4-axis model (usability, consistency, accessibility, delight) is an implementation artifact
  and must not persist as the scoring structure. Re-mapping is required to maintain alignment between spec, rubric, and implementation.
- Rejected: Formally adopt 4-axis as the scoring architecture
  - DO NOT: Use the 4-axis model as the official evaluation architecture. Temptation: 4-axis is already implemented and changing it requires migration work
- Related: DR-0080, US-0029-0005, AC-0029-0009..AC-0029-0013, BR-0029-0009..BR-0029-0014
