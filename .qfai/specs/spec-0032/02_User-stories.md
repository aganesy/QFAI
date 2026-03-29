# 02 User Stories

## US Catalog

- US-0032-0001: Cost/Time Metrics Emission
- US-0032-0002: Mode Guidance
- US-0032-0003: Reviewer Drift Tracking
- US-0032-0004: Capability Profile Assessment

## US-0032-0001: Cost/Time Metrics Emission

- Parent: CAP-0032
- Goal: Emit cost and time metrics per iteration and as aggregate at run completion
- Non-goals: Real-time metric streaming, billing integration, cost ceilings
- Notes: NFR-0003 requires 100% emission for premium runs; metrics must be emitted even for single-iteration runs (REQ-0016)

## US-0032-0002: Mode Guidance

- Parent: CAP-0032
- Goal: Recommend standard vs premium mode based on project characteristics such as size, complexity, and test coverage
- Non-goals: Automatic mode switching without user consent, cost prediction
- Notes: Guidance is advisory; user retains final mode selection (REQ-0017)

## US-0032-0003: Reviewer Drift Tracking

- Parent: CAP-0032
- Goal: Detect and report reviewer behavior drift across successive runs on the same project
- Non-goals: Automatic drift correction, reviewer scoring/ranking
- Notes: Drift is measured by comparing finding distributions and severity patterns between runs (REQ-0018)

## US-0032-0004: Capability Profile Assessment

- Parent: CAP-0032
- Goal: Generate a capability profile summarizing the project's assessed characteristics and readiness
- Non-goals: Prescriptive remediation, cross-project comparison
- Notes: Profile includes dimensions such as test maturity, spec coverage, code complexity (REQ-0019)
