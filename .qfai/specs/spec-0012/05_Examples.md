# 05 Examples

## EX-0012-0001: Declared Screen Has Complete Evidence

- BR-Ref: BR-0012-0002
- Status: superseded — see EX-0012-0136 / EX-0012-0137 (per-spec iter-dir layout, `.review.json`-only; PNG/HTML capture retired by new model).
- Given `.qfai/contracts/ui/screens.yaml` declares `orders-dashboard`
- And `.qfai/evidence/prototyping/iter-NN/orders-dashboard.png` exists
- And `.qfai/evidence/prototyping/iter-NN/orders-dashboard.html` exists
- Then validate does not emit `QFAI-UIE-001/002` for that screen

## EX-0012-0002: Screenshot Missing

- BR-Ref: BR-0012-0003
- Status: superseded — see EX-0012-0137 (no `.png` written by new model; Reviewer-driven Playwright replaces capture step).
- Given `.qfai/contracts/ui/screens.yaml` declares `orders-dashboard`
- And the HTML snapshot exists
- And the screenshot does not exist
- Then validate emits `QFAI-UIE-001`
- And the skill must rerun capture before completion

## EX-0012-0003: HTML Missing

- BR-Ref: BR-0012-0003
- Status: superseded — see EX-0012-0137 (no `.html` written by new model; Reviewer-driven Playwright replaces capture step).
- Given `.qfai/contracts/ui/screens.yaml` declares `orders-dashboard`
- And the screenshot exists
- And the HTML snapshot does not exist
- Then validate emits `QFAI-UIE-002`
- And the skill must rerun capture before completion

## EX-0012-0086: Step 0 Planning

- BR-Ref: BR-0012-0001
- Given `/qfai-prototyping` starts a new iteration
- When the skill prepares execution planning
- Then it records `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`

## EX-0012-0089: Evaluator Inputs

- BR-Ref: BR-0012-0005
- Given screenshots and HTML snapshots are captured
- And root `DESIGN.md` is available as brand SSOT
- And the `lap-001..008` catalog is available
- And prior reviewer review.json context exists from a previous iter
- Then the reviewer (product-surface-reviewer) receives all input classes before scoring

## EX-0012-0098: Delegation Scope And Reviewer Roles

- BR-Ref: BR-0012-0004
- Given `/qfai-prototyping` declares a Delegation Scope Table
- Then UI implementation, screenshot capture, evaluation scoring, and build roles are named explicitly
- And invalid role assignments are surfaced as findings

## EX-0012-0099: Validate Gate Before Completion

- BR-Ref: BR-0012-0006
- Given prototyping evidence exists
- When completion is evaluated
- Then `qfai validate --fail-on error` is required before the run can be accepted

## EX-0012-0100: Verify Gate Blocks On REVISE

- BR-Ref: BR-0012-0007
- Given `/qfai-verify` leaves a `REVISE` review artifact
- Then prototyping completion remains blocked

## EX-0012-0101: Non-UI Exclusion

- BR-Ref: BR-0012-0009
- Given a spec is classified as `ui_bearing: false`
- When prototyping execution scope is determined
- Then the spec is excluded from prototyping execution
- And missing screen contracts do not over-fire UI evidence requirements

## EX-0012-0102: Legacy Traceability Space Retained

- BR-Ref: BR-0012-0008, BR-0012-0010
- Given legacy traceability IDs remain present in historical ledgers
- And legacy validator slices (executionPlan / Lighthouse / designSystemCompliance / calibration overrides) remain available as validator/reference behavior only
- Then current documentation keeps the identifier space reserved
- And it does not restore weighted-total-only runtime narratives
- And the legacy validation slice is not surfaced as a public mode contract

## EX-0012-0110: Convergence on iter-08

- BR-Ref: BR-0012-0024
- Status: superseded — see EX-0012-0124 (10-cycle terminator) and EX-0012-0130 (AND-across-spec×screen qualitative convergence). 15-cycle narrative retired.
- Given the run produces 9 iters where iter-08 has all 4 UX axes `exceptional`, `layoutAntiPatternsDetected: []`, and `designMdViolations: []`.
- When `qfai prototyping iterate --cycle 9` runs.
- Then it returns exit 64. `prototyping.json#stopReason` is `"axes-exceptional"`. `acceptedIterationIndex === 8`.

## EX-0012-0111: Pivot triggered by 3-low-IA + latest lap-\*

- BR-Ref: BR-0012-0021
- Given iter-05/06/07 each with `informationArchitecture: "acceptable"` and iter-07 with `layoutAntiPatternsDetected: ["lap-002-deadend-flow"]`.
- When `computePivotDirective(history)` runs.
- Then it returns `"pivot"`. With latest `layoutAntiPatternsDetected: []`, returns `"refine"`.

## EX-0012-0112: Cycle ≥1 hash mismatch forces re-run

- BR-Ref: BR-0012-0026
- Given `prototyping.json#designMdSha256 === "abc123..."` and the user edits `DESIGN.md` between cycles to hash `"def456..."`.
- When `qfai prototyping iterate --cycle 1` runs.
- Then exit code is `2`, stderr contains `"DESIGN.md hash mismatch — re-run from cycle 0"`.

## EX-0012-0113: convergence blocked by designMdViolations

- BR-Ref: BR-0012-0024
- Given iter-09 with all 4 UX axes `exceptional` and `layoutAntiPatternsDetected: []` but `designMdViolations: [{category: "shadow", expected: "0 1px 2px rgba(0,0,0,0.06)", found: "0 8px 24px rgba(0,0,0,0.20)", location: "card.tsx:32"}]`.
- When `qfai prototyping iterate --cycle 10` runs.
- Then exit code is `0` (continue); convergence is not declared.

## EX-0012-0114: design-system mirrors DESIGN.md post-loop

- BR-Ref: BR-0012-0027
- Given a fresh run starting cycle 0 with frozen `DESIGN.md`.
- When the contracts are checked.
- Then `.qfai/contracts/design/design-system.yaml` does NOT exist pre-loop. Post-handoff, it is generated as a deterministic byte-equivalent mirror of `DESIGN.md` token tables.

## EX-0012-0115: Single lineage at run start

- BR-Ref: BR-0012-0017
- Given a fresh `/qfai-prototyping` run.
- When `qfai prototyping iterate --cycle 0` is called.
- Then exactly one `iter-00/` directory is created, and no parallel `candidates/` directory is produced.
- And subsequent `iterate --cycle <n>` continue the same lineage as `iter-NN/` siblings under the same run.

## EX-0012-0116: Latest-accepted policy holds across cycles

- BR-Ref: BR-0012-0018
- Given `prototyping.json#iterations[]` has 7 entries with indices 0..6.
- When `acceptedIterationIndex` is read.
- Then it equals `iterations.length - 1` (i.e. 6), regardless of any prior iter having higher ordinal scores; no best-of-history selection is applied.

## EX-0012-0117: review.json schema enforces 4 UX axes ordinal

- BR-Ref: BR-0012-0019
- Status: superseded — see EX-0012-0128 (new payload contains 6 qualitative `*Feel` fields + 4 ordinal axes; path moves to `iter-NN/spec-NNNN/<screen>.review.json`).
- Given an `iter-NN/review.json` with `scores` containing only `informationArchitecture: "strong"`, `navigationFlow: "strong"`, `usability: "strong"`, `functionality: "exceptional"`.
- When validate runs.
- Then no schema finding is raised. With a missing axis or an extra key, `QFAI-PROT-020` is emitted; with a `critique` of 50 words, `QFAI-PROT-022` is emitted; with `pivotDirective: "stop"`, `QFAI-PROT-023` is emitted.

## EX-0012-0118: lap-\* whitelist and IA acceptable cap

- BR-Ref: BR-0012-0020
- Given `iter-NN/review.json` with `layoutAntiPatternsDetected: ["lap-001-orphan-page"]` and `informationArchitecture: "strong"`.
- When validate runs.
- Then `QFAI-PROT-021` is raised because the lap detection caps `informationArchitecture` at `acceptable`. With `informationArchitecture: "acceptable"` the finding is not raised.

## EX-0012-0119: ordinalIndex monotonic mapping

- BR-Ref: BR-0012-0022
- Given the ordinal scale `weak < acceptable < strong < exceptional`.
- When `ordinalIndex` is applied.
- Then `ordinalIndex(weak) === 0`, `ordinalIndex(acceptable) === 1`, `ordinalIndex(strong) === 2`, `ordinalIndex(exceptional) === 3`. Other inputs are rejected by the type guard.

## EX-0012-0120: Generator and evaluator are distinct sub-agents

- BR-Ref: BR-0012-0023
- Given `/qfai-prototyping` declares the delegation map.
- When the iteration loop dispatches generation and review.
- Then `product-experience-architect` performs generation and `product-surface-reviewer` performs evaluation as two distinct sub-agent identities; reusing the same identity for both raises a delegation finding (self-preference bias prevention).

## EX-0012-0121: SKILL.md size budget enforcement

- BR-Ref: BR-0012-0025
- Given the shipped `qfai-prototyping/SKILL.md` and its 5 reference files.
- When line counts are measured.
- Then `SKILL.md` ≤ 130 lines, and `iteration-loop.md` (≤ 80) + `generator-prompt.md` (≤ 60) + `reviewer-prompt.md` (≤ 100) + `handoff.md` (≤ 50) + `design-md-spec.md` (≤ 120) combined ≤ 410 lines.

## v2.1 / Multi-Spec Reviewer-Driven Loop (REQ-0001..0013)

> BR-Refs below cite `BR-0012-0028..0040`, published with this PR (CHG-002).
> Predicted-vs-actual stitch is no longer required — the IDs are final.

## EX-0012-0122: Multi-Spec Resolution At Cycle 0

- BR-Ref: BR-0012-0028
- Given the consumer project contains 3 UI-bearing specs (`SPEC-0007`, `SPEC-0011`, `SPEC-0019`) and 2 non-UI specs.
- When `/qfai-prototyping` is invoked once and `resolveAllUiBearingSpecs()` runs at cycle 0.
- Then exactly the 3 UI-bearing specs enter the loop together; the 2 non-UI specs are excluded; no per-invocation primary-spec selection prompt is shown.

## EX-0012-0123: Zero UI-Bearing Specs Is Deterministic No-Op

- BR-Ref: BR-0012-0028
- Given the consumer project contains zero UI-bearing specs.
- When `/qfai-prototyping` is invoked.
- Then the run exits 0 with no error, no iter-dir is created, and the user-facing log states "no UI-bearing specs resolved; no-op".

## EX-0012-0124: 10-Cycle Terminator At `index === 9`

- BR-Ref: BR-0012-0029
- Given the run has produced iters with indices 0..8 without converging.
- When the loop dispatches cycle 9 and the terminator check runs.
- Then `MAX_ITERATIONS === 10` and `MAX_ITERATION_INDEX === 9` are the sole SSOT, `shouldStop([…, iter9])` returns `"max-iterations"`, and the run hard-stops at the end of cycle 9.

## EX-0012-0125: 10-Cycle Constants Are Sole SSOT

- BR-Ref: BR-0012-0029
- Given the codebase post-redesign.
- When `MAX_ITERATIONS` and `MAX_ITERATION_INDEX` are searched.
- Then both are exported from `core/prototyping/iteration.ts` (values `10` and `9` respectively); no parallel literal `15` / `14` referring to iteration budget remains in `src/`, `assets/`, or validator wiring; validators `QFAI-PROT-005` / `QFAI-PROT-006` reference `index === 9`.

## EX-0012-0126: Reviewer Sub-Agent Launches Playwright

- BR-Ref: BR-0012-0030
- Given the loop reaches the evaluation step for `(SPEC-0007, screen=orders-dashboard)` at cycle 3.
- When the Reviewer sub-agent (`product-surface-reviewer`) is dispatched.
- Then the Reviewer itself opens Playwright against the live prototype URL, performs human-like operation (click / type / navigate / scroll), and the orchestrator does NOT pre-script the session, does NOT call a separate capture step, and does NOT pass an `interaction.json` transcript to the Reviewer.

## EX-0012-0127: No Scripted Interaction Transcript

- BR-Ref: BR-0012-0030
- Given a completed cycle for any spec × screen.
- When the iter-dir contents are listed.
- Then no `interaction.json`, no `.png`, and no `.html` exist; the only Reviewer-emitted artifact is `iter-NN/spec-NNNN/<screen>.review.json`.

## EX-0012-0128: Qualitative Review Payload Schema

- BR-Ref: BR-0012-0031
- Given the Reviewer completes its Playwright session for `(SPEC-0007, orders-dashboard)`.
- When it writes `iter-03/SPEC-0007/orders-dashboard.review.json`.
- Then the payload validates against the new schema: 6 short-prose `*Feel` fields (`operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, `menuReachabilityFeel`) and 4 ordinal axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`), plus `layoutAntiPatternsDetected[]` and `designMdViolations[]`.

## EX-0012-0129: ≤ 200 Words Per Feel Field

- BR-Ref: BR-0012-0031
- Given a review payload with `operability` containing 250 words.
- When schema validation runs.
- Then the validator emits a length-bound finding and the payload is rejected; ≤ 200 words per `*Feel` field is enforced.

## EX-0012-0130: Qualitative Convergence AND Across Spec × Screen

- BR-Ref: BR-0012-0032
- Given at cycle 7 every `(spec, screen)` pair has all 4 ordinal axes `exceptional`, `layoutAntiPatternsDetected: []`, and `designMdViolations: []`.
- When the global convergence check runs.
- Then the run converges, exits 64 with `stopReason: "axes-exceptional"`, and `acceptedIterationIndex === 7`.

## EX-0012-0131: Convergence Blocked By One Lagging Spec

- BR-Ref: BR-0012-0032
- Given at cycle 5 all pairs are `exceptional` except `(SPEC-0011, settings)` which has `navigationFlow: "strong"`.
- When the convergence check runs.
- Then convergence is NOT declared; the aggregated cycle record names `SPEC-0011` as a lagging spec; the loop continues to cycle 6.

## EX-0012-0132: License-Verify Success Path

- BR-Ref: BR-0012-0033
- Given every image slot is filled from Unsplash or Pexels and `prototype-handoff.yaml#imageSources[]` records `{url, license, attribution, source}` for each.
- When `licenseVerify` runs at end-of-cycle.
- Then it returns success; no hard-stop is triggered; the cycle proceeds normally.

## EX-0012-0133: License-Verify Failure Hard-Stop Exit 66

- BR-Ref: BR-0012-0033
- Given one image slot is filled from a non-allowlisted source (`pinterest.com`) or has `license: "unknown"`.
- When `licenseVerify` runs.
- Then the run hard-stops with exit code 66, stderr names the offending image URL, and no further cycles are dispatched.

## EX-0012-0134: Lock Drift Hard-Stop Exit 2

- BR-Ref: BR-0012-0034
- Given cycle 0 recorded `prototyping.json#designMdSha256 === "abc123…"` and at cycle 4 the on-disk `DESIGN.md` has hash `"def456…"`.
- When the cycle-4 lock-vs-live SHA gate runs.
- Then the run exits 2 with stderr `"DESIGN.md hash mismatch — re-run from cycle 0"`; no review payloads are written for cycle 4.

## EX-0012-0135: Reviewer Playwright Session Failure Hard-Stop

- BR-Ref: BR-0012-0034
- Given all Reviewer sub-agent attempts for `(SPEC-0007, orders-dashboard)` at cycle 2 fail (Playwright cannot reach target URL after all retries).
- When the orchestrator observes the per-pair Reviewer Playwright failure across all reviewers.
- Then the run hard-stops with a non-zero exit code, the pair is named in stderr, and no convergence is declared.

## EX-0012-0136: Per-Spec Iter-Dir Layout

- BR-Ref: BR-0012-0035
- Given cycle 2 of a run covering `SPEC-0007` (screen `orders-dashboard`) and `SPEC-0011` (screen `settings`).
- When the iter-dir is enumerated after the cycle completes.
- Then exactly these files exist: `iter-02/SPEC-0007/orders-dashboard.review.json` and `iter-02/SPEC-0011/settings.review.json`; no other files (no `.png`, no `.html`, no `interaction.json`, no flat-root `review.json`).

## EX-0012-0137: Path Helpers Descend Into spec-NNNN

- BR-Ref: BR-0012-0035
- Given the iter-dir layout from EX-0012-0136.
- When `iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs` are called.
- Then `iterationReviewPathPerSpec(2, "SPEC-0007", "orders-dashboard")` returns `…/iter-02/SPEC-0007/orders-dashboard.review.json`; `findIterationReviewFiles` globs across spec-NNNN subdirs; stale cleanup honors `/^iter-\d{2,}$/` semantics and does not delete unrelated dirs.

## EX-0012-0138: Certify Aggregates Per-Spec Presence

- BR-Ref: BR-0012-0036
- Given the accepted iter is `iter-07` and the cycle-0 frozen spec set lists `SPEC-0007` and `SPEC-0011`.
- When `qfai prototyping certify` runs and `SPEC-0011/settings.review.json` is missing under `iter-07/`.
- Then certify rejects (non-zero exit) and stderr names `SPEC-0011` as the missing aggregate; `readFrozenSpecsCovered()` drove the per-spec loop.

## EX-0012-0139: Menu Reachability Exercised In Playwright Session

- BR-Ref: BR-0012-0037
- Given the prototype exposes a sidebar with 6 entries and a topbar with 2 entries.
- When the Reviewer runs its Playwright session.
- Then it attempts to navigate every primary menu entry, and `menuReachabilityFeel` in the review payload describes which entries reached intended targets and which did not (e.g. "sidebar/Reports leads to 404"); unreachable entries surface as qualitative critique and do NOT hard-fail the cycle.

## EX-0012-0140: Mid-Run Spec-Set Change Detection

- BR-Ref: BR-0012-0038
- Given cycle 0 froze the spec set to `[SPEC-0007, SPEC-0011]` and at cycle 3 a new UI-bearing spec `SPEC-0019` appears on disk.
- When the `specsCovered` shallow-equal drift check runs.
- Then the run exits non-zero (deferred-additions hard-stop), the new spec is named, and the run does NOT restart cycle 0; `SPEC-0019` is deferred to the next `/qfai-prototyping` invocation.

## EX-0012-0141: Drift Check Reads Frozen Set

- BR-Ref: BR-0012-0038
- Given cycle 0 wrote the frozen spec set to cycle-0 evidence.
- When `specsCovered` drift check is invoked at cycle ≥1.
- Then it reads the cycle-0 frozen set (not the live filesystem) as the comparison baseline; mid-run filesystem mutations are visible only via the diff result, not by silently re-resolving.

## EX-0012-0142: Per-Spec Time-Budget Soft Warning

- BR-Ref: BR-0012-0039
- Given the per-spec time-budget cap is 5 minutes and `SPEC-0007` cycle 4 takes 7 minutes.
- When the cycle completes.
- Then a soft warning is appended to `SPEC-0007/orders-dashboard.review.json` (e.g. `"timeBudgetSoftWarning": "per-spec 5m cap exceeded: 7m"`); the run does NOT hard-fail; only the global 10-cycle budget can hard-fail.

## EX-0012-0143: Cycle 0 Freezes Spec Set

- BR-Ref: BR-0012-0040
- Given a fresh `/qfai-prototyping` invocation.
- When cycle 0 completes.
- Then cycle-0 evidence records the frozen spec set (e.g. `frozenSpecsCovered: ["SPEC-0007","SPEC-0011"]`); this set is the SSOT for all subsequent cycles' per-spec loops and drift checks.

## EX-0012-0144: Cycle 0 Freezes License-Class Catalog

- BR-Ref: BR-0012-0040
- Given a fresh `/qfai-prototyping` invocation.
- When cycle 0 completes.
- Then cycle-0 evidence records the stock-photo license-class catalog (allowed sources `[unsplash, pexels]` and their license tiers); this catalog is the SSOT used by `licenseVerify` for all subsequent cycles.

## EX-0012-0145: Cycle-9 Idempotency on Non-Converged Loop

- BR-Ref: BR-0012-0034
- Given a 10-iteration loop that did not converge (`iterations.length === 10` recorded with the terminator at `index === 9`).
- When the operator runs `qfai prototyping iterate --cycle 9` a second time against the recorded state.
- Then the CLI returns exit 65 (max-iterations terminator) directly without routing through the `expectedNextCycle === 10` cycle-mismatch path.

## EX-0012-0146: Reviewer-Driven `<screen>.review.json` Schema (4 Ordinal Axes + 6 \*Feel)

- BR-Ref: BR-0012-0030
- Given a Reviewer sub-agent finishes a per-`(spec, screen)` Playwright session.
- When it emits `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json`.
- Then the payload carries the 4 ordinal UX axes plus the 6 `*Feel` prose fields (each ≤ 200 words), `layoutAntiPatternsDetected[]`, `designMdViolations[]`, and the closed-schema cycle / retryCount / wallTimeSec / softWarnings fields; closed-schema parsing rejects any out-of-range cycle (`> MAX_ITERATION_INDEX`) and any unknown nested key.

## EX-0012-0147: Per-Spec UI Contract Resolver Precedence (5 Candidates)

- BR-Ref: BR-0012-0030
- Given `.qfai/contracts/ui/` carries any of the documented 5 candidate layouts for a spec.
- When `qfai prototyping certify` runs.
- Then the resolver applies TRUE first-hit-wins across the single-file canonical candidates (#1 `<spec-id>.yaml`, #2 `<bare>.yaml`, #3 `ui-<bare>.yaml`); when none match, it aggregates the multi-file candidates (#4 `ui-<bare>-<slug>.yaml` glob and #5 `<spec-id>/<sub>.yaml` recursive subdir) with first-write dedup within the spec's own scope.

## EX-0012-0148: Zero-UI Live Result Is Cycle-0 Only

- BR-Ref: BR-0012-0034
- Given a project whose UI markers / contracts have all been removed mid-loop while `prototyping.json#frozenSurfaceUnion` still records a cycle-0 frozen union.
- When `qfai prototyping iterate --cycle 1` (or later) runs.
- Then the CLI exits 2 with a "removed mid-loop / frozen scope no longer reachable" diagnostic naming the frozen union — the no-op-exit-0 semantic is intentionally scoped to cycle 0 only.

## EX-0012-0149: Legacy `prototyping.json` Hard-Fail (No `frozenSurfaceUnion`)

- BR-Ref: BR-0012-0034
- Given a pre-12th-wave `prototyping.json` record with `frozenSpecsCovered` but no `frozenSurfaceUnion` field.
- When `qfai prototyping iterate --cycle 1` (or later) runs against that record.
- Then the CLI exits 2 with a re-seed instruction (`--cycle 0 --target-url <url>`); the cycle ≥ 1 drift gate does NOT silently fall back to `frozenSpecsCovered` (which would re-enable the original MAJOR/P1 false-positive that the 11th-wave fix closed).

## EX-0012-0150: License Catalog Set-Equality Drift Detection

- BR-Ref: BR-0012-0033
- Given a cycle ≥ 1 invocation against a `prototyping.json#frozenLicenseCatalog` that differs from the in-memory `DEFAULT_LICENSE_CATALOG` SSOT.
- When the catalog drift gate runs.
- Then byte-permutation differences (reordered `allowedSources`, reordered tier entries) MUST NOT trip the gate (set-equality semantic via `licenseCatalogsEqual`), but any semantic difference (added source, removed `sourceHosts`, malformed shape) MUST exit 2 with a re-seed instruction.

## EX-0012-0151: `show-spec` JSON Payload Discriminant

- BR-Ref: BR-0012-0030
- Given any seeded `prototyping.json` record.
- When `qfai prototyping show-spec` emits its JSON payload.
- Then the payload carries `frozenSpecsCoveredSource: "frozenSpecsCovered" | "specsCovered"` so operators can detect pre-Wave-3 legacy seed records, and `liveUiBearing` is a `string[]` of spec IDs from the same `resolveSurfaceUnion()` that iterate's cycle ≥ 1 drift gate consumes.

## EX-0012-0152: Per-Spec Subdirectory UI Contract Fallback

- BR-Ref: BR-0012-0030
- Given a consumer project whose `01_Spec.md` has no `surface_type: ui-bearing` frontmatter but whose `.qfai/contracts/ui/spec-<id>/` subdirectory holds at least one `.yaml` file (e.g. `home.yaml` or `screens/main.yaml`).
- When `resolveAllUiBearingSpecs` / `hasMatchingUiContract` runs.
- Then the spec is treated as UI-bearing (the documented candidate #5 layout from `.qfai/contracts/ui/README.md` is recognised by the resolver); an empty subdir (no `.yaml` inside) does NOT match, and a subdir whose only file is `*.yml` (single-l) is also rejected for parity with the top-level `*.yaml`-only convention.

## EX-0012-0153: Drift Gate Wins Over Convergence Ordering

- BR-Ref: BR-0012-0038
- Given a recorded multi-UI project where cycle-0 captured `frozenSurfaceUnion = ["0001", "0002"]` and the most recent iteration is fully converged (all 4 UX axes scored `exceptional`, empty `layoutAntiPatternsDetected`, empty `designMdViolations`) — but the secondary spec's `surface_type: ui-bearing` marker was removed mid-loop so live `resolveSurfaceUnion()` now returns `["0001"]`.
- When `qfai prototyping iterate --cycle <N≥1>` runs.
- Then the cycle ≥ 1 lock-drift gates fire BEFORE `shouldStop()`: certify exits 2 (lock-drift class) with `spec-set drift detected mid-loop` and `removed=[0002]` echoed in stderr, rather than letting the convergence check return exit 64 first and mask the freeze violation.

## EX-0012-0154: Certify Rejects Non-Canonical `frozenSpecsCovered[]` Entries

- BR-Ref: BR-0012-0030
- Given a hand-edited `prototyping.json` whose `frozenSpecsCovered[]` contains a non-canonical entry — e.g. a path-traversal value (`"../../../etc/passwd"`), a slash-injected value (a canonical-looking prefix concatenated with `/../../escape`), a trailing-whitespace value (`"0001 "`), a non-numeric value (`"spec-abcd"`), or a value with the wrong digit count (`"spec-"` + 3 digits).
- When `qfai prototyping certify` reads the record and validates each `frozenSpecsCovered[]` entry against `CANONICAL_SPEC_ID` before any review-path construction.
- Then certify exits 2 with the malformed id echoed verbatim (`JSON.stringify` form) and the canonical shape (`spec-NNNN` / 4-digit `NNNN`) named in stderr — refusing to construct any review path from unvalidated input so `path.join(root, "iter-NN", id, "<screen>.review.json")` cannot escape the intended subtree.

## EX-0012-0155: Certify Distinguishes Absent vs Malformed `frozenSpecsCovered`

- BR-Ref: BR-0012-0030
- Given a `prototyping.json` where the `frozenSpecsCovered` key IS present on the record but the value fails the validation contract — e.g. a non-array (`{ "frozenSpecsCovered": "0001" }`), an empty array (`[]`), an array with a non-string entry (`[42]`), an array with an empty-string entry (`["0012", ""]`), or an explicit `null` / `undefined` on a present key (`{ "frozenSpecsCovered": null }`).
- When `qfai prototyping certify` reads the record at either the per-(spec × screen) gate or the cert-sealing call site.
- Then certify exits 2 with a "present but malformed" diagnostic that names the rejection reason (e.g. `not an array`, `empty`, `non-string`, `empty-string`, `value is null`, `value is undefined`), instead of silently falling back to the legacy single-spec `specsCovered` field. The absent-key case (record has no `frozenSpecsCovered` key at all) still legitimately falls back to `specsCovered` for pre-Wave-3 evidence compatibility — the contract distinguishes "operator omitted the field" from "operator partially-corrupted the field" so a partial / corrupt edit cannot downgrade certification scope and let missing secondary-spec review evidence ship a sealed certificate.

## EX-0012-0156: Shared-`screenId` Multi-File Subdir Requires Full Per-Spec Re-Parse

- BR-Ref: BR-0012-0030
- Given a multi-file subdir UI contract layout where two UI-bearing specs declare the SAME `screenId` from per-spec subdir files (each subdir's own `home.yaml` declaring `home`) and the second spec additionally has a unique screen in its subdir (its own `settings.yaml` declaring `settings`).
- When `qfai prototyping certify` runs the per-(spec × screen) review.json presence gate.
- Then certify enumerates the FULL per-spec screen set via `readPerSpecScreens()` (which uses an authoritative `fg()` walk of the per-spec subdir), so both the shared `home` and the unique `settings` are required for the second spec — omitting that spec's `home.review.json` is correctly rejected. Pre-fix the legacy `indexPerSpecScreens()` optimisation built a per-spec map from the project-wide deduplicated `screenContracts.sourceRef` list, which dropped one spec's `home` sourceRef and let the indexed re-parse return a partial set for that spec — the gate happily passed without requiring the shared-screenId review.json.

## EX-0012-0157: `show-spec` Fails Closed on Malformed `frozenSpecsCovered`

- BR-Ref: BR-0012-0030
- Given a `prototyping.json` carrying a valid legacy `specsCovered: ["0012"]` AND a corrupt multi-spec scope (`frozenSpecsCovered: null` from a hand-edit).
- When `qfai prototyping show-spec` reads the record.
- Then show-spec exits 2 with a "present but malformed" diagnostic naming the rejection reason (e.g. `value is null`) instead of silently downgrading the reported scope to the legacy `specsCovered` field. The semantic mirrors the certify-side wave-33 contract pinned by AC-0012-0045 class (h): a present-but-malformed `frozenSpecsCovered` is a hard error on the certify surface, and AC-0012-0052 carries the parallel sub-clause for the show-spec surface so the absent-vs-malformed discrimination holds across both. (iterate-side present-but-malformed `frozenSpecsCovered` is handled separately: iterate consumes the legacy `specsCovered` reader for the cycle ≥ 1 shallow-equal primary-spec check, and the multi-spec drift baseline is read from `frozenSurfaceUnion`, not `frozenSpecsCovered` — see the show-spec JSDoc scope note in `prototypingCertify.ts` for the surface split.) show-spec must not present a misleading legacy fallback to operators / automation making recovery decisions.

## EX-0012-0158: Absolute `paths.specsDir` Override Resolves the primarySpecId Pin

- BR-Ref: BR-0012-0030
- Given a consumer project whose `qfai.config.yaml` carries `paths.specsDir` as an ABSOLUTE path — POSIX (`/abs/specs`), Windows drive-letter (`C:\abs\specs`), or UNC (`\\host\share\specs`) — pointing to an external location outside the repository root, AND `prototyping.primarySpecId` set to a 4-digit id whose `spec-NNNN` directory exists at that absolute path.
- When `resolveSurfaceUnion()` evaluates the primarySpecId-on-disk pin via `specDirExists()`.
- Then the pin is included in the union and `prototyping iterate --cycle 0` runs the loop. Pre-fix `specDirExists()` built the probe path with `path.join(root, specsDir, dirName)`, which silently concatenates root + absolute (rather than resetting to the absolute), so the probe missed the on-disk spec, the pin was dropped from the union, and iterate hit the zero-UI short-circuit (exit 0) for explicit-primary workflows relying on absolute path overrides. Post-fix `path.resolve()` correctly resets to the absolute segment when one is supplied, so the probe finds the spec dir regardless of whether `specsDir` is relative or absolute. (Node's `path.resolve` treats POSIX `/abs/...`, Windows drive-letter `C:\...`, and UNC `\\host\share\...` as absolute on their respective platforms; the regression test uses `os.tmpdir()`-rooted fixtures so the CI matrix exercises whichever absolute shape the lane's OS produces.)

## EX-0012-0159: Absolute `paths.contractsDir` Override Resolves Per-Spec UI Contracts

- BR-Ref: BR-0012-0030
- Given a consumer project whose `qfai.config.yaml` carries `paths.contractsDir` as an ABSOLUTE path (POSIX `/abs/contracts`, Windows drive-letter `C:\abs\contracts`, or UNC `\\host\share\contracts`) pointing outside the repository root, AND a per-spec UI contract file at `<absoluteContractsDir>/ui/spec-NNNN.yaml`.
- When `readPerSpecScreens(root, contractsDir, "spec-NNNN")` runs (called by certify's per-(spec × screen) review.json presence gate).
- Then the helper discovers the per-spec contract file and returns its declared screens. Pre-fix `path.join(root, contractsDir, "ui")` concatenated root + absolute (rather than resetting), so the probe at `<root>/<absoluteContractsDir>/ui/...` missed every file and the helper returned `null`. Certify then silently fell back to the project-wide screen list and enforced wrong `(spec, screen)` coverage for explicit-contracts-dir workflows. Post-fix `path.resolve()` resets to the absolute segment, matching the wave-45 `specDirExists` fix.

## EX-0012-0160: Partner-Helper Symmetry — Project-Wide UI Reader Resolves Absolute `contractsDir` Identically

- BR-Ref: BR-0012-0030
- Given a consumer project whose `qfai.config.yaml` carries `paths.contractsDir` as an ABSOLUTE path (POSIX / Windows drive-letter / UNC) pointing outside the repository root, AND a project-wide UI contract file at `<absoluteContractsDir>/ui/screens.yaml` declaring two or more screens.
- When `readUiContractScreenContracts(root, contractsDir)` runs (the project-wide screen reader that partners with the per-spec `readPerSpecScreens` on the certify path).
- Then the reader discovers the project-wide contract file and returns ALL declared screens. Pre-wave-48 the project-wide reader used the same `path.join(root, contractsDir, "ui")` pattern, so an absolute `contractsDir` would have produced different discovery results in the two helpers — the project-wide pass returning empty while the per-spec pass (already fixed in wave-47) returned its full set. The asymmetric output would have silently broken certify's per-(spec × screen) gate even after wave-47. Post-wave-48 both helpers use `path.resolve()`, so absolute-path handling is symmetric across the project-wide and per-spec discovery paths. The regression test pins the symmetry directly via the exported `readUiContractScreenContracts` API (see `06_Test-Cases.md` for the corresponding TC and its assertion).

## EX-0012-0161: `hasMatchingUiContract` Rejects Directory Named Like a UI Contract File

- BR-Ref: BR-0012-0030
- Given a consumer project with a UI-only spec (no `surface_type: ui-bearing` marker, no legacy title marker, no `prototyping.primarySpecId` pin) AND a misauthored DIRECTORY at the canonical UI-contract path — e.g. `<contractsDir>/ui/0007.yaml/` is a directory rather than a file.
- When `resolveAllUiBearingSpecs()` / `resolveSurfaceUnion()` evaluate the UI-contract signal via `hasMatchingUiContract()`.
- Then the spec is NOT classified as UI-bearing — the resolver returns an empty union and iterate / drift gates take the documented no-op path. Pre-wave-50 the direct-match arm used `access()` which only checked existence (file OR directory), so a directory at that path would have falsely classified the spec as UI-bearing and driven the loop against a phantom surface. Post-wave-50 the direct-match arm uses `stat().isFile()`, consistent with the entries-walk branch's `entry.isFile()` filter for the spec-prefixed / ui-prefixed candidates.

## v1.9.1 Defect Remediation Examples (CHG-005)

## EX-0012-0162: Tailwind Preflight Literals Pass When Allowlisted + Body-Scoped

- BR-Ref: BR-0012-0041
- Given an iter HTML using Tailwind CDN preflight (e.g. `<style>*, ::before, ::after { box-sizing: border-box; } body { font-family: ui-sans-serif, system-ui, ...; }</style>`), internal `--tw-shadow: 0 1px 2px rgba(0,0,0,0.05)`, and alpha-modifier `bg-blue-500/80` (compiled to `rgba(...)`),
- When `findDesignMdViolations(html, designMd)` runs with OQ-0103 = β + γ (preflight allowlist + body-scope),
- Then `designMdViolations[]` is empty for all enumerated preflight literals. Pre-fix the gate scanned the entire document including Tailwind CDN preflight `<style>` block, surfacing `~1000+` violations on first load.

## EX-0012-0163: `var(--font-sans)` Resolves Against `:root` Before Safety Judgment

- BR-Ref: BR-0012-0042
- Given a fixture `:root { --font-sans: system-ui; } body { font-family: var(--font-sans); }`,
- When `scanFonts(rootDeclarations, bodyDeclarations)` runs,
- Then the scanner calls `unwrapVarReference("var(--font-sans)", rootDeclarations)` → `"system-ui"`, judges `system-ui` against SAFE_LITERALS, returns no violation. Pre-fix only `scanColors` invoked `unwrapVarReference`; `scanFonts` / `scanRadius` / `scanShadow` saw raw `var(...)` text and either threw or produced spurious violations.

## EX-0012-0164: CSS-wide Keywords Are Safe Across All Scanners

- BR-Ref: BR-0012-0043
- Given declarations `color: inherit`, `font-family: initial`, `border-radius: unset`, `box-shadow: revert`, `background-color: currentColor`,
- When each of the four scanners evaluates its declaration,
- Then `designMdViolations[]` is empty. Unit test matrix exercises `5 keywords × 4 scanners = 20` pass cells.

## EX-0012-0165: `--card-shadow:` Custom Property With rgba() Is Stripped (OQ-0104 Option B)

- BR-Ref: BR-0012-0044
- Given `--card-shadow: 0 4px 8px rgba(0,0,0,0.1); --btn-shadow-hover: 0 2px 4px rgba(15,23,42,0.05);` in `:root`,
- When `SHADOW_DECL_STRIP_RE` (matching `--*-shadow*:`) preprocesses the input,
- Then both declarations are stripped before `scanColors` sees them; `designMdViolations[]` contains no entries naming those rgba values. Pre-fix the strip regex matched only `--shadow-*:`, leaving `--card-shadow:` / `--btn-shadow-hover:` color literals surfacing as violations.

## EX-0012-0166: Japanese 1200-Character Critique Passes via Intl.Segmenter (OQ-0105)

- BR-Ref: BR-0012-0045
- Given a Japanese-only `proseCritique` of 1200 characters (no whitespace word boundaries),
- When `countWords(prose)` runs with `Intl.Segmenter('ja', { granularity: 'word' })` and applies the OR-condition `200..500 words OR 600..2500 characters`,
- Then the prose passes (1200 chars is inside the OR-fallback band). An English critique of 350 words also passes via the primary word-count band. Pre-fix `countWords` used `/\s+/`-split-and-count, returning `1` for a Japanese-only critique and emitting `QFAI-PROT-002 (count 1 below band 200..500 words)`.

## EX-0012-0167: `browserTool: "playwright-cli"` Accepted with D-DEPRECATED-PROBE Warning

- BR-Ref: BR-0012-0046
- Given `prototyping.execution.browserTool: "playwright-cli"` in `qfai.config.yaml`,
- When `qfai prototyping iterate` reads the config,
- Then the value is accepted AND `D-DEPRECATED-PROBE` is emitted (severity: warning during deprecation window). A parallel config carrying `browserTool: "playwright"` is accepted with no warning.

## EX-0012-0168: `iterate --capture` Opt-In Writes PNG / HTML; Default Preserves DR-0012-0029

- BR-Ref: BR-0012-0047
- Given `qfai prototyping iterate` invoked WITHOUT `--capture`,
- When the loop runs,
- Then `iter-NN/<screen-id>.png` / `.html` are NOT written (DR-0012-0029 default preserved; amendment pinned by `DR-0012-0031`). A second invocation WITH `--capture` writes both per `iterate-plan.json#screens[]`. When `htmlSourceCopy: true`, the .html mirrors `.qfai/prototypes/iter-NN/<screen-id>.html` byte-for-byte (no runtime style-block injection from `page.content()`).

## EX-0012-0169: `iterate --auto-serve` Refuses to Kill Foreign Process

- BR-Ref: BR-0012-0048
- Given port 3000 occupied by a process whose owning command is `node /home/user/myapp/server.js` (not a prior iterate),
- When `iterate --auto-serve` starts,
- Then iterate detects the foreign owner, refuses to kill it, reports `PID=12345 owning command=node /home/user/myapp/server.js`, and exits with input-error status. A second test on a port owned by a prior iterate force-kills the prior owner cleanly via `tree-kill` / `taskkill /F /T`. NFR-0106 enforced.

## EX-0012-0170: `prototyping.json` Passes validate Without Orchestrator Post-Processing

- BR-Ref: BR-0012-0049
- Given a converged `iterate` invocation,
- When `iterate` writes `prototyping.json` with `iterations[0..N]` each carrying `commitSha: "abc123" | "uncommitted"`, non-empty `proseCritique`, `scores`, `layoutAntiPatternsDetected: []`, `designMdViolations: []`, `pivotDirective: "continue"`, `reviewerId: "rev-001"`, and `evidenceRefs[]` matching `screens[].id` set,
- Then `qfai validate --profile prototyping --fail-on error` exits 0 without any orchestrator post-processing. Top-level carries `acceptedIterationIndex: N` and `stopReason: "axes-exceptional"`.

## EX-0012-0171: `verify.json#scope: "prototyping"` Satisfies certify (OQ-0107 Option B)

- BR-Ref: BR-0012-0050
- Given `verify.json` carrying `scope: "prototyping"` with the prototyping-profile lanes PASS,
- When `qfai prototyping certify --check` runs at HEAD with no `/qfai-atdd` or `/qfai-implement` artifacts present,
- Then certify exits 0 and writes `completion-certificate.json` with `scope: "prototyping"`. A second invocation with `scope: "full"` requires the full ATDD + implement gates and is rejected when those artifacts are missing. Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` fires when a PR reintroduces the cycle.

## EX-0012-0172: SKILL.md Single-Spec Realignment Removes Public `resolveSurfaceUnion()`

- BR-Ref: BR-0012-0051
- Given the v1.9.1 ship,
- When the public skill surface is grep-scanned (`grep -rn "resolveSurfaceUnion" assets/init/.qfai/assistant/skills/qfai-prototyping/`),
- Then zero hits in SKILL.md / references/; the helper remains as an internal `core/prototyping/specResolution.ts` export for the cycle ≥ 1 drift gate only. Documentation lint pins zero remaining multi-spec public-surface mentions at HEAD.

## EX-0012-0173: Aggregate-Dir Mirror Uses Underscore Casing (OQ-0110 Option A)

- BR-Ref: BR-0012-0052
- Given a converged iter with declared `screens[].id = ["home_page", "settings_panel"]`,
- When `iterate` mirrors accepted-iter content,
- Then `.qfai/evidence/prototyping/screenshots/home_page.png`, `screenshots/settings_panel.png`, `html/home_page.html`, `html/settings_panel.html` all exist. Hyphen-form (`home-page.png`) is rejected at validate time.

## EX-0012-0174: `--cycle 0 --force` Moves iter-00 to Timestamped Backup BEFORE Clear

- BR-Ref: BR-0012-0053
- Given `iter-00/` non-empty with prior content (e.g., `iter-00/home.review.json`),
- When `qfai prototyping iterate --cycle 0 --force` runs at ISO timestamp `2026-05-24T12:00:00Z`,
- Then `iter-00.backup-2026-05-24T12-00-00Z/` is created byte-equivalent to the pre-move `iter-00/`, THEN `clearEvidenceIterDirs` clears `iter-00/`, THEN cycle 0 re-seeds fresh. Without `--force`, iterate refuses with the recovery snippet `cp -r iter-00 iter-00.backup-<ISO> && qfai prototyping iterate --cycle 0 --force`. NFR-0114 byte-equivalence pinned by integration test.

## EX-0012-0175: `[BLOCKED] exit-64` Summary Names Top-3 Categories

- BR-Ref: BR-0012-0054
- Given a non-converged cycle 3 with 1023 `designMdViolations`, 0 anti-patterns, 1 axis below exceptional,
- When `iterate` emits its cycle-end summary,
- Then stdout contains `[BLOCKED] exit-64 prevented by: 1023 designMdViolations (top: color=#fff at iter-03/scr_001.html:97), 0 anti-patterns, 1 axis below exceptional (aesthetics: passing).`. Category identifier names are stable additive-only (NFR-0103).

## EX-0012-0176: `primarySpecId` Error Text + (SHOULD) Input Normalisation (OQ-0112)

- BR-Ref: BR-0012-0055
- Given inputs `"abc"` (unparseable) vs `1` / `"1"` / `"01"` / `"0001"` (normalisable),
- When iterate validates each,
- Then `"abc"` surfaces `primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received abc`. The SHOULD-shipped normaliser accepts `1` / `"1"` / `"01"` / `"0001"` and normalises internally to the canonical `0001` form; for those inputs no error is emitted.

## EX-0012-0177: md5 Duplicate-Capture Surfaces lap-009 Advisory-Failing (OQ-0109)

- BR-Ref: BR-0012-0056
- Given a post-capture iter where `home.png` and `dashboard.png` share md5 `d41d8cd98f00b204e9800998ecf8427e`,
- When iterate runs duplicate detection,
- Then `layoutAntiPatternsDetected[]` contains `{code: "lap-009", category: "duplicate-capture", offenders: ["home", "dashboard"], md5: "d41d8cd..."}` with severity error. Override requires Reviewer `justification:` text. NFR-0113 determinism: re-running the same iter produces the identical finding.

## EX-0012-0178: `--license-patch` Add-Only Patch Audit Row (SHOULD)

- BR-Ref: BR-0012-0057
- Given a frozen license catalog with sources `[unsplash, pexels]` AND an add-only patch adding `wikimedia-commons` (CC BY-SA tier),
- When `qfai prototyping iterate --license-patch ./patch.yaml` runs,
- Then the new frozen catalog is written with `[unsplash, pexels, wikimedia-commons]` AND `prototyping.json#licensePatchAudit[]` appends `{appliedAt: "2026-05-24T...", patchSha256: "abc...", addedSources: ["wikimedia-commons"]}`. A second invocation attempting to DELETE `pexels` is rejected with the hint to use the cycle-0-restart path. Async patch I/O failure surfaces `qfai prototyping iterate: license-patch read failed: ENOENT ./patch.yaml`.

## EX-0012-0179: `iter-NN/iterate-context.json` Subagent Hint (SHOULD)

- BR-Ref: BR-0012-0058
- Given a finished cycle 3,
- When iterate finalises,
- Then `iter-03/iterate-context.json` is written with `{priorCycle: 3, priorScores: {informationArchitecture: "acceptable", ...}, openBlockers: ["lap-009 on home/dashboard"], priorTailwindContract: "β+γ"}`. The file is advisory; certify ignores its presence/absence.

## EX-0012-0180: `--cycle 10` Error Recommends Peek Mode (SHOULD)

- BR-Ref: BR-0012-0059
- Given `qfai prototyping iterate --cycle 10`,
- When iterate validates the arg,
- Then stderr reads `--cycle accepts 0..9 (=10 cycles total). --cycle 10 would be the 11th cycle and is not supported.` and recommends `--cycle 9 --check-convergence`. A second invocation with `--cycle -1` surfaces the same error class.

## EX-0012-0181: Cycle-0 `--emit-skeletons` Token-Driven Placeholder Coverage (DR-0261, DR-0273)

- BR-Ref: BR-0012-0060
- Given a `frozenSurfaceUnion` resolved from two UI-bearing specs — `<spec-A>` (`home`, `dashboard`) and `<spec-B>` (`settings`) — and DESIGN.md tokens `--color-primary: #2563eb`, `--radius-md: 8px`,
- When `qfai prototyping iterate --cycle 0 --emit-skeletons` runs (default `--skeleton-mode placeholder`),
- Then iterate writes 3 placeholder HTML files (`home`, `dashboard`, `settings`), each styled from the DESIGN.md tokens with NO per-screen LLM generation call, and after convergence each of the 3 screens carries `evidenceRefs[]` containing both `{kind: "screenshot"}` and `{kind: "html"}`. Re-running WITHOUT `--emit-skeletons` produces no skeleton files (v1.9.1 behavior preserved). Passing `--skeleton-mode full` instead escalates to per-screen generation.

## EX-0012-0182: DESIGN.md In-Zone vs Out-Of-Zone Edit (DR-0262)

- BR-Ref: BR-0012-0061
- Given DESIGN.md whose front-matter declares `patch_zone:\n  tokens: [--color-accent, --radius-md]` and a frozen `majorHash: "a1b2c3"`,
- When an operator edits `--radius-md: 8px` → `10px` (in-zone),
- Then only `patchHash` changes; `majorHash` stays `a1b2c3` and prototyping evidence stays valid (no Reviewer-Gate finding). When the operator instead edits `--font-sans` (not in the zone) OR deletes the `patch_zone:` block, evidence is invalidated and Reviewer Gate emits `R-DESIGN-MD-PATCH-OUT-OF-ZONE` (warning).

## EX-0012-0183: `--mode exploration` Relaxation + Certify Rejection (DR-0263)

- BR-Ref: BR-0012-0062
- Given `qfai.config.yaml#prototyping.mode: convergence` overridden by `qfai prototyping iterate --mode exploration`,
- When an exploration iteration fails `QFAI-CRIT-008` (axes below exceptional) and has a `designMdViolations[]` entry,
- Then both findings downgrade error → warning (medium relaxation) while a missing required schema field still hard-errors and a non-allowlisted image source still exits 66; `prototyping.json#mode` records `"exploration"`. When `qfai prototyping certify` later runs against a loop containing that iteration, certify rejects with `R-EXPLORATION-CERTIFY-ATTEMPT` and `acceptedIterationIndex` resolves only to a convergence-mode iteration.

## EX-0012-0184: `QFAI-CRIT-009` Keyword Text + `--capture` Template Skeleton (REQ-0162)

- BR-Ref: BR-0012-0063
- Given `taskFidelity` evidence missing the `four_state_check` section,
- When `qfai validate` runs,
- Then `QFAI-CRIT-009` error text names every required keyword (e.g. `cta_visibility`, `four_state_check`) and the expected document section, and `references/evidence-requirements.md` shows the same keywords with example markdown. Running `qfai prototyping iterate --capture` emits a template skeleton containing `## cta_visibility\n<!-- TODO -->\n## four_state_check\n<!-- TODO -->` placeholders for the full keyword set.

## EX-0012-0185: iter-NN Mutation-Log Entry on `--cycle 0 --force` (REQ-0165)

- BR-Ref: BR-0012-0064
- Given an existing non-empty `iter-00/<spec-id>/home.review.json` (2048 bytes),
- When `qfai prototyping iterate --cycle 0 --force` moves it into `iter-00.backup-<ISO>/` before clearing,
- Then `.qfai/evidence/prototyping/mutation-log.jsonl` gains a line `{"ts":"2026-05-27T...","caller":"iterate","path":"iter-00/<spec-id>/home.review.json","action":"move","priorSize":2048,"newSize":0}` for that file; the log is git-ignored. A reviewer who finds a code path overwriting `iter-03/<spec-id>/settings.review.json` without calling the mutation-log writer surfaces `R-EVIDENCE-MUTATION-UNLOGGED` (error).
