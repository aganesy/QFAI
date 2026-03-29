# 09 Delta

## Change Summary

- Change ID: DELTA-S32-001
- Date: 2026-03-29
- Primary: spec-0032 initial creation
- Tags: v1.7.6, observability, metrics, drift, capability-profile
- Summary: Initial spec creation for Observability & Capability Profile (CAP-0032)

## Rationale

- Cost/time transparency for informed premium mode decisions
- Reviewer drift tracking for scoring consistency

## Candidates Considered

1. Structured JSON metrics
2. JSON Lines streaming format (adopted)
3. Prometheus-style metrics

## Adopted

- Adopted: JSON Lines streaming format
- Why: Streaming-compatible, human-readable, no external dependency
- Evidence: spec-0032 DEC-0032-0001

## Rejected

- Candidate: Structured JSON metrics
- Reason: Large JSON payloads require complete file read; not streaming-friendly
- DO NOT: Use single monolithic JSON files for metric storage
- Temptation: Simpler schema with one file per run

- Candidate: Prometheus-style metrics
- Reason: Requires external service dependency; violates CLI tool constraints
- DO NOT: Require external metric collection services
- Temptation: Industry-standard observability stack

## Impact

- Affects: packages/qfai/src/core/observability/ (new module)
- Validation: qfai validate pass, integration tests for all TC-0032-* cases

## Follow-ups

- OQ-0005 (cost ceilings): Deferred to v1.8.x pending observability data
- Owner: agent
- Due: v1.8.x
