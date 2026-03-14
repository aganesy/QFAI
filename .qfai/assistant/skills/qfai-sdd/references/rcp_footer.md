# RCP Footer (qfai-sdd / SSOT)

This document is the SSOT for fixing the Review Cycle of `/qfai-sdd` based on the “spec/contract premise.”
It is not a shared convention for discussion-packs or other skills.

---

## Review Target (Fixed)

- Scope: `sdd`
- Primary artifacts (review targets):
  - `.qfai/specs/spec-*/**` (spec pack)
  - `.qfai/contracts/**` (API/DB/UI contracts)
  - `.qfai/evidence/**` (decision rationale and experiment logs)
  - `.qfai/report/**` (validate / coverage / preflight output)

---

## Roster Execution Rule (Fixed)

- Roster reads `.qfai/assistant/steering/review-roster.yml`
- Each review returns `PASS` / `FAIL` / `N/A`
- If even one `FAIL` is returned, **immediately return to remediation**
- After remediation, **create a new review cycle** and re-execute the roster from the beginning (skipping is prohibited)

---

## Validate Hard Gate (Required)

- Each review cycle must execute `qfai validate --fail-on error --format github`
- `.qfai/report/validate.log` must exist and correspond to the latest artifacts

---

## Required Review Artifacts (Required)

The following must be generated for each review cycle:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

Minimum requirements for `summary.json`:

- `version`
- `created_at`
- `target`
- `roster`
- `overall_status`

---

## spec-pack Specific Review Perspectives (sdd-specific)

1. Specification consistency

- The spec's “purpose/scope/out-of-scope” must not contradict the subsequent user story / acceptance criteria / examples
- “Examples” must **substantiate acceptance criteria as concrete cases** (not mere repetition)

2. Decision observability (Decision Log)

- `delta` / decisions / rejected must retain “why adopted/not adopted”
- “Temptation (commonly recurring mistakes)” must be explicitly documented to prevent re-adoption

3. Contract validity

- API / UI / DB contracts must use terminology consistent with the spec (do not assign different names to the same concept)
- If prohibited references (contract exception rules, etc.) exist, follow the rules in the contract-side README

4. Traceability (if needed)

- Linkage from spec to tests (ATDD/TDD) must not be broken
- Focus on covering “boundary/negative/permission/state transition” perspectives rather than simply increasing quantity

---

## Common FAILs and Recovery (sdd-specific)

- FAIL: Acceptance criteria are abstract and not grounded in examples
  - Recovery: Add cases in “input -> state -> output” format to Examples, and include at least one boundary/error case
- FAIL: Contracts are created ahead of the spec, causing terminology/concept drift
  - Recovery: First reinforce Glossary/Capabilities, then revise contracts to align with the spec
- FAIL: decision/rejected entries are thin, making it impossible to trace the reasoning
  - Recovery: Document alternatives A/B/C with adoption criteria, and leave DO NOT/Temptation entries in Rejected
