# 05 Scope

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329175059391 |
| Date          | 2026-03-29                   |

## In Scope

1. **External Critique Adapter** -- critique provider interface, generic command provider, optional example providers, structured critique schema, fail-open semantics
2. **Harness Contracts + Calibration Pack** -- calibration examples, scoring alignment assets, accept/refine/pivot policy, disagreement handling, plateau handling, loop exit policy, weighted score/floors/max iterations
3. **`/qfai-prototyping-full-harness` Skill** -- premium explicit non-default mode, planner/generator/evaluator split, 5-15 iteration class loops, capped at max iterations, evidence+review mandatory
4. **Reviewer Calibration / Capability Profile / Observability** -- cost/time observability, mode guidance, reviewer drift tracking, capability profile by task/model/mode
5. **Long-running Handoff + Display/Stub Detection** -- handoff artifacts for long runs, display-only detection, stub-only detection, interaction-depth review support

## Out of Scope

1. Reworking v1.7 artifact architecture (stable from v1.7.5)
2. Making full-harness the default prototyping mode
3. Polluting deterministic validate with critique semantics
4. Building GUI or dashboard surfaces
5. Requiring external providers for standard path operation

## Success Criteria

- Premium path (`/qfai-prototyping-full-harness`) works end-to-end: plan -> generate -> evaluate -> accept/refine/pivot
- Standard path has zero performance regression from premium path addition
- Critique adapter fail-open semantics verified: provider failure does not block workflow
- Observability metrics emitted for every premium run (cost, time, iteration count)
- Calibration pack loaded and applied consistently across runs
- Handoff artifacts enable session resumption after interruption
- Display-only and stub-only detection flags superficial implementations

## Anti-goals

- Premium path obligations leaking into standard path defaults
- Critique provider output being treated as authoritative (it is advisory)
- Calibration becoming a hard gate that blocks runs when assets are missing
- Long-running mode accumulating unbounded state without cleanup

## Release Slicing

| Slice | Description                          | Dependencies          |
| ----- | ------------------------------------ | --------------------- |
| S1    | External Critique Adapter            | None                  |
| S2    | Harness Contracts + Calibration Pack | S1 (critique schema)  |
| S3    | `/qfai-prototyping-full-harness`     | S1, S2                |
| S4    | Observability + Capability Profile   | S3 (metrics emission) |
| S5    | Handoff + Display/Stub Detection     | S3 (loop artifacts)   |
