# 10 Plan

- Goal: keep validate SSOT aligned to the current contract-first, skill-first validator wiring.

## Implementation approach

The change is maintenance-shaped rather than feature-shaped: the validator set
already exists, and this spec's job is to keep the SSOT describing the set that
is actually wired. The three subsections below are the shape of that work —
what is wired today, which files carry it, and the standing rules that keep the
two in step. The alternative considered was to let the spec describe a target
wiring and reconcile later; it was rejected because a spec that describes a set
the code does not have is worse than no spec, since it is read as if it were
true.

## Current State

- `packages/qfai/src/core/validate.ts` is the repo-root downstream entrypoint.
- Direct-pack canonical UIX validation remains a discussion-only path.
- Prototyping validation now depends on `prototypingSkill`, `uiEvidenceArtifacts`, and `prototypingEvidence`, not on a recommendation validator.

## File Touchpoints

| File                                                          | Role                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/qfai/src/core/validate.ts`                          | Aggregates the current validator set                                |
| `packages/qfai/src/core/validators/skill/prototypingSkill.ts` | Validates `/qfai-prototyping` skill contract                        |
| `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`    | Enforces screenshot / HTML evidence presence                        |
| `packages/qfai/src/core/validators/prototypingEvidence.ts`    | Validates current prototyping.json schema and convergence semantics |

## Maintenance Notes

1. Remove deleted validator references from active spec text as code evolves.
2. Keep direct discussion-pack validation clearly separate from repo-root validate behavior.
3. Update traceability whenever the prototyping validator set changes.

## v1.9.2 Second-Wave (REQ-0166 validate side / REQ-0164 / REQ-0167)

### How — SaaS-package validate profile (REQ-0166)

- Add a `saas-package` profile to `validate.ts` that runs the prototyping-profile validators, asserts a DCON-005 attestation at `.qfai/contracts/design/design-system.yaml`, and runs the CLI-HANDOFF schema check; PASS requires all three.
- Mark ATDD-class and implement-class gates as SKIPPED under this profile and emit a `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) finding per skipped gate naming it; keep the skip set identical to the certify-side `notes:` (spec-0014).

### How — `primary_tasks` shape acceptance (REQ-0164)

- Add `auditProfile.ts` (NEW) accepting BOTH string-only and structured `{ id, label, acceptance }` (`additionalProperties: false`, all required, per DR-0268); string-only PASSes during the deprecation window.
- `QFAI-AUD-020` warning text names the `3..7` recommended count band (per DR-0267).

### How — pack-location CI lane (REQ-0167)

- Add `packages/qfai/scripts/check-pack-locations.mjs` (NEW) scanning staged/changed dirs (per DR-0274) for `review-*/` / `discussion-*/` outside `tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`; wire into `pnpm ci:lint`.
- On a misplaced dir emit `R-PACK-LOCATION-DRIFT` (error) referencing `.agents/rules/root-additions-policy.md` and proposing the correct path; pass silently otherwise (no full-tree walk).

## Test approach

- `validators` level for finding-emit checks (`D-SAAS-PACKAGE-VERIFY-SKIPPED`, `QFAI-AUD-020`, closed-schema reject); `integration` level for end-to-end profile wiring and the CI lane (CLI shape: `--profile saas-package`, `pnpm ci:lint`). Each REQ has normal AND error/boundary coverage (TC-0004-0067..0073).
- The boundary that needs its own case rather than a shared one is the closed schema: `additionalProperties: false` on the structured `primary_tasks` shape is only proven by a rejection case, and the string-only form must keep passing for the length of the deprecation window — so acceptance and rejection are separate cases, not one parameterised case.

### File Touchpoints (additions)

| File                                                      | Role                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/qfai/src/core/validate.ts`                      | Adds the `saas-package` profile + skip-gate finding emission          |
| `packages/qfai/src/core/validators/auditProfile.ts` (NEW) | Accepts string-only + structured `primary_tasks`; `QFAI-AUD-020` band |
| `packages/qfai/scripts/check-pack-locations.mjs` (NEW)    | Pack-location lint lane wired into `pnpm ci:lint`                     |

## Risk mitigation

| Risk                                                                                                                     | Likelihood / impact | Mitigation                                                                                                                                             | Trigger to act                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| The `saas-package` profile skips ATDD-class and implement-class gates silently, and a skipped gate reads as a passed one | med / high          | Each skipped gate emits `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) naming itself, so the skip is stated rather than inferred from an absence               | A gate is added to the skip set without a matching finding             |
| The validate-side skip set and the certify-side `notes:` (spec-0014) drift apart                                         | med / high          | The two are required to be identical; they are a declared pair rather than two independently maintained lists                                          | Either side's skip set changes in a diff that does not touch the other |
| Deleted validators stay referenced in active spec text, so the SSOT describes a set the code does not have               | high / med          | Maintenance note 1 makes removal part of the same change; the File Touchpoints table names real module paths, so a deletion breaks the reader's search | A path in the touchpoints table no longer resolves                     |
| The pack-location lane walks the whole tree and becomes slow enough to be disabled                                       | low / med           | The lane scans staged / changed directories only (DR-0274) and passes silently otherwise; no full-tree walk                                            | A full-tree walk is proposed for the lane                              |
