# US-0001-0058: Layer-specific test obligations

## User Story

As a QA engineer on the story tree, I want `qfai validate` to report each business flow, acceptance criterion and example that has no test at its layer, with a recorded exception as the only way out, so that test coverage follows the layer each obligation belongs to.

## Legacy Source Scope

- In:
  - `qfai validate` command
  - layered spec / traceability / contract / discussion validators
  - contract-first design/ui validators
  - direct discussion-pack canonical UIX validators
  - prototyping skill content validator
  - prototyping evidence validator
  - breakthrough evidence validator
  - UI evidence artifact validator
  - design contract readiness validator
  - non-UI safe skip behavior
  - waiver handling
  - design-md / design-md-lock / design-system-mirror validators (DCON-030 / DCON-031 / DCON-032)
  - prototyping evidence v3 validator (4 UX axes ordinal + layoutAntiPatternsDetected + designMdViolations + pivotDirective schema)
  - layoutAntiPatternsDetected schema validator (the identifiers declared in `packages/qfai/assets/validators/layoutAntiPatterns.json`)
  - designMdViolations schema validator (`{category: color|font|radius|shadow, expected, found, location}` shape)
  - `findDesignMdViolations(html, designMd)` purity / determinism contract
  - SaaS-package validate profile (REQ-0166 validate side): `qfai validate --profile saas-package` gates on prototyping-profile PASS + DCON-005 attestation + CLI-HANDOFF schema; ATDD / implement-class gates SKIPPED with `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info)
  - `auditProfile.ts` `primary_tasks` shape acceptance (REQ-0164): string-only AND structured `{id,label,acceptance}` (DR-0268); `QFAI-AUD-020` warning names the `3..7` count band (DR-0267)
  - workflow-hygiene CI lane (CHG-007): a repository script wired into `pnpm ci:lint`, emitting `R-WORKFLOW-HYGIENE-DRIFT` / `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`. Recorded here because this spec owns the `pnpm ci:lint` lane inventory; the lane's own rule set is owned by spec-0017 (`CAP-0017`) and its shipped-file targets by spec-0003. No validator and no finding code is added to `qfai validate` itself — same posture as the pack-location lane below.
  - pack-location CI lane (REQ-0167): `packages/qfai/scripts/check-pack-locations.mjs` wired into `pnpm ci:lint`, emits `R-PACK-LOCATION-DRIFT` (DR-0274 scope)
  - tracked-scratch CI lane: `scripts/check-tracked-scratch.mjs` wired into `pnpm ci:lint`, failing when git tracks any path under the scratch directory. Recorded here because this spec owns the `pnpm ci:lint` lane inventory; the script is a root toolchain file and belongs to spec-0017. No validator and no finding code is added to `qfai validate` itself — same posture as the two lanes above
  - story-tree validators, selected by the detected layout: the story directory and ID findings, the unlisted-contract finding, the two tables and the rows a validator reads, the EX-to-AC and BR-to-EX links, the test obligations per layer with their exception rows, the old-layout error, and the append-only and change-request checks of the `drift` profile
  - `qfai validate --flow BF-NNNN`, which scopes a run on the story tree to named business flows, and the refusal of `--spec` there
- Out:
  - report rendering details
  - prototyping runtime execution
  - deleted prototyping recommendation validator surface
  - legacy compatibility namespaces removed from package surface

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0004/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0004/02_User-stories.md#us-0004-0045`
