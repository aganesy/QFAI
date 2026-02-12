# 18 Delta

## Update History

| Date       | Change ID  | Summary                     |
| ---------- | ---------- | --------------------------- |
| 2026-02-12 | DELTA-0001 | Initial sample layered pack |

## Adoption and Rejection Log

### DELTA-0001: Layered sample initialization

#### Adopted

- Decision: provide a thin but complete `spec-001` sample with `01` to `18`.
- Why: reduce ambiguity for first-time contributors.
- Impacted files: `.qfai/specs/spec-001/**`

#### Rejected

- Option: provide only headings without links to contracts.
- Reason: readers still need cross-layer examples.
- DO NOT: publish a sample with missing AC to EX to TC links.
- Temptation: minimal files are faster but increase onboarding confusion.

#### Follow-up

- Next checks: keep sample aligned with `specs/README.md`.
- Owner: docs and tooling maintainers
