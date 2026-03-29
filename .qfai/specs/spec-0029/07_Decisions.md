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
