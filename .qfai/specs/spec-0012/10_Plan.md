# 10 Plan

- Goal: keep prototyping SSOT aligned to the multi-spec, autonomous, reviewer-driven Playwright loop with qualitative-only convergence per CHG-002 (discussion-20260516144141078).

## Implementation approach

The shape of the change is a set of coupled edits across
`core/prototyping/**` and the two CLI commands, taken together rather than
one module at a time — the cycle budget, the per-spec evidence layout and the
review payload schema are read by validators and fixtures that would otherwise
disagree with the code mid-change. `Current State` records what is wired today,
`Next Maintenance Steps` is the ordered walk, and the sections after them carry
the per-change detail.

The alternative considered was per-invocation primary-spec selection with a
scripted interaction transcript and quantitative pass thresholds — the v2.0 /
UX-loop shape. It was rejected in CHG-002 and its surfaces were purged rather
than deprecated, because a quantitative threshold on a qualitative judgement
reads as a measurement while being a vote.

### Intent-driven entry (CAP-0018)

This change introduces no architectural element. It writes
`qfai-prototyping`'s own `references/orchestrated-mode.md` in the table format
CLI-WFFILE owns.

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`. Everything here is **U2**:

- `qfai-prototyping/references/orchestrated-mode.md`, holding:
  - the entry check (BR-0012-0136);
  - the Operations table, `existing-runtime-contract` (BR-0012-0137);
  - work on the target spec only, and on a target that is not UI-bearing, a
    `blocked` result listing its cause for `operator` (BR-0012-0138).
- One citation line in `qfai-prototyping/SKILL.md`.
- `iterate` and `certify` are unchanged.

Left out: the core's refusals (spec-0018); any new design contract.

## Current State

- `/qfai-prototyping` resolves every UI-bearing spec in one invocation via `resolveAllUiBearingSpecs()` in `core/prototyping/specResolution.ts`; per-invocation primary-spec selection is removed.
- Iteration budget is 10 cycles (cycle 0 + cycles 1..9). `MAX_ITERATIONS = 10` and `MAX_ITERATION_INDEX = 9` are the sole SSOT in `core/prototyping/iteration.ts`.
- Reviewer sub-agent itself drives Playwright per `(spec, screen)` pair; no scripted interaction transcript, no AC selector/assertion, no PNG capture, no HTML snapshot.
- Per `(spec, screen, cycle)` evidence is a single qualitative payload at `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json` containing the 4 ordinal UX axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`) AND six qualitative `*Feel` prose fields (`operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, `menuReachabilityFeel`, each ≤ 200 words) AND `layoutAntiPatternsDetected[]` AND `designMdViolations[]`. (Target layout — TDD-0384 per-spec iter-dir migration deferred; current implementation is mixed: `prototypingCertify.ts` reads `iter-NN/spec-NNNN/` when present, `prototypingIterate.ts` still writes flat `iter-NN/` only.)
- Convergence is the AND across every `(spec, screen)` pair of `(all 4 axes == exceptional) AND lap[] empty AND designMdViolations[] empty`. No quantitative AC-pass / transition-pass thresholds are consulted.
- Autonomous from cycle 0..9 with no per-cycle prompts. Hard-stop classes: (a) lock drift exit 2, (b) Reviewer Playwright-session failure (exit 64 reused with `sessionStatus` discriminator on the review payload), (c) license-verify failure exit 66, (d) mid-run spec-set change exit 2 (same class as lock drift).
- Stock-photo fill is drawn from the cycle-0 frozen license-class catalog (allowlist: Unsplash, Pexels per OQ-0002). Every fill is recorded as `{url, license, attribution, source}` in `prototype-handoff.yaml#imageSources[]`. Unknown license / non-allowlisted source hard-stops with exit 66.
- Cycle 0 freezes (a) the resolved spec set and (b) the stock-photo license-class catalog into cycle-0 evidence; all subsequent cycles read both as SSOT.
- `qfai prototyping certify` aggregates per-spec presence via `readFrozenSpecsCovered()` and rejects when any covered spec lacks any declared screen's `<screen>.review.json` at the accepted iter.
- DESIGN.md (root) remains the brand SSOT, frozen by SDD Phase 0 into `.qfai/contracts/design/DESIGN.md.lock.yaml#designMdSha256`. Cycle ≥1 hash drift exits 2.
- Validate/verify hold the machine gates. CHG-001 purge of legacy v1.x surfaces (round/candidate/absorption funnel, `fullHarness.iterations[]`, `scoringTrace[]`, `allReviewerAxesPerfect100`, mode budgets, hard-floor evaluation rubric) remains in force.
- CHG-002 purge of v2.0 / UX-loop surfaces (15-cycle, single-spec lineage, PNG+HTML capture, scripted interaction transcript, AC-pass% / transition-pass% quantitative thresholds, flat iter-dir layout, primary-spec selection prompt, `critique` 200..500-word single-string field) is in force; superseded rows retained as `Status: superseded` with replacement-ID pointers.

## Next Maintenance Steps

1. Land code changes alongside `spec-0012`:
   - `core/prototyping/specResolution.ts` — replace `resolvePrimaryPrototypingSpec` with `resolveAllUiBearingSpecs`.
   - `core/prototyping/iteration.ts` — change `MAX_ITERATIONS` from 15 to 10 (single edit, SSOT); update `MAX_ITERATION_INDEX` to 9; remove any 15-magic from validators and fixtures atomically.
   - `core/prototyping/iterationPaths.ts` (or wherever the helpers live) — `iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs` descend into `spec-NNNN` while preserving `/^iter-\d{2,}$/` cleanup semantics.
   - `core/prototyping/licenseVerify.ts` — new module; `licenseVerify(imageSources, frozenCatalog)` returns success when every entry's `source` is in the allowlist and `license` is in the catalog tiers; non-allowlisted entries map to caller-side exit 66.
   - `core/prototyping/certificate.ts` — `readFrozenSpecsCovered()` reads cycle-0 frozen set; `prototypingCertify` aggregates per-spec.
   - `core/prototyping/reviewerDispatch.ts` — Reviewer sub-agent launches Playwright in-process; remove orchestrator-side capture step.
   - `core/prototyping/evaluatorReview.ts` — review payload schema gains the six `*Feel` prose fields with ≤ 200-word bound; drops `critique` (legacy single-string field).
   - `core/validators/prototypingEvidence.ts` — `QFAI-PROT-005` / `QFAI-PROT-006` reflect 10-cycle and `index === 9` terminator; no 15-magic remains in any validator.
   - `cli/commands/prototypingIterate.ts` — multi-spec loop, autonomous (no per-cycle stdin), hard-stop class dispatch with the agreed exit codes.
   - `cli/commands/prototypingCertify.ts` — per-spec aggregation against frozen spec set.
2. Wire `.qfai/contracts/cli/qfai-prototyping.md` (Phase 0 contract authored under CHG-002) into the implementation review checklist.
3. Keep `16_Traceability-ledger.md` and `tdd/test-list.md` aligned with real remaining tests. The new TDD-0371..0412 rows added in `16_Traceability-ledger.md` need their 8-column form mirrored into `tdd/test-list.md` once the actual test files (`tests/core/prototyping/*.test.ts`, `tests/cli/commands/prototyping*.test.ts`, `tests/e2e/prototypingFullLoop.test.ts`) land.
4. When the iterate / certify schema changes, update `prototypingIterate.ts`, `prototypingCertify.ts`, `iteration.ts`, `evaluatorReview.ts`, `licenseVerify.ts`, and this spec together.
5. Resolve `08_Open-questions.md` OQ-0012-0002..0005 (prototyping.json shape under per-spec namespace; pivotDirective retention vs supersede; critique-vs-`*Feel` schema cleanup; capture role removal in steering / agent-routing). v1.8.10 shipped with implementation that pre-empts the recommended dispositions — OQ-0012-0002 adopts (A) flat + spec discriminator as an interim until per-spec migration (TDD-0384), OQ-0012-0003 retains `pivotDirective` per recommendation (A), OQ-0012-0004 drops `critique` per recommendation (A) and the `*Feel` schema is in `evaluatorReview.ts`. Final OQ closure is the follow-up gate; the "before implementation lands" wording is superseded by "before next major release".
6. Do not recreate standalone prototyping spec packs unless the product surface genuinely splits again; extend `spec-0012` instead.

## Test approach

| Layer | Where                                                   | What it proves                                                                   |
| ----- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| unit  | `packages/qfai/tests/core/prototyping/*.test.ts`        | Cycle budget, per-spec path helpers, license verification, review-payload schema |
| cli   | `packages/qfai/tests/cli/commands/prototyping*.test.ts` | Hard-stop exit-code dispatch and per-spec certify aggregation                    |
| e2e   | `packages/qfai/tests/e2e/prototypingFullLoop.test.ts`   | The loop end to end, cycle 0 through convergence                                 |

Two boundaries need their own cases rather than a shared one:

- The cycle terminator. `MAX_ITERATIONS = 10` and `MAX_ITERATION_INDEX = 9` are
  one SSOT in `core/prototyping/iteration.ts`, and the off-by-one at `--cycle 9`
  reaches two different branches depending on evaluation order — TDD-0436 pins
  exit 65 from the `shouldStop` branch and asserts the cycle-mismatch message is
  NOT the one emitted.
- The hard-stop classes. Lock drift (2), reviewer session failure (64), license
  verification (66) and mid-run spec-set change (2) share exit codes in pairs, so
  a case asserting "it stopped" cannot tell two of them apart; each class asserts
  its own discriminator.

### Intent-driven entry (CAP-0018)

Every case this change adds reads a shipped file, so it is `L3`, under
`packages/qfai/tests/integration/`. One module holds the cases of one business
rule.

| Layer | What it proves                                                                                                                                                | Module                                                      | Cases                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| `L3`  | `SKILL.md` cites `references/orchestrated-mode.md` with one line, and the reference cites the shared entry check                                              | `prototypingEntryCheckSpec0012.test.ts`                     | TC-0012-0489               |
| `L3`  | The Operations table lists exactly `existing-runtime-contract`                                                                                                | `prototypingOperationsSpec0012.test.ts`                     | TC-0012-0490               |
| `L3`  | Under a work order the skill works on its target spec only and creates no contract; the non-UI stop                                                           | `prototypingWorkOrderScopeSpec0012.test.ts`                 | TC-0012-0491, TC-0012-0492 |
| E2E   | The prototype stage of a `feature` run, through the prototype variant that spec-0018 `10_Plan.md` `### Which journey discharges which stage story` maps to it | The spec-0018 journey's module, annotated with US-0012-0144 | US-0012-0144 (TDD-0566)    |

**Cases that stand alone, and the kept failure.**

- The non-UI stop has its own case, TC-0012-0492, and is the one kept failure.
  On a target that is not UI-bearing, the skill writes no `DESIGN.md`, no UI
  contract and no surface declaration. It returns `blocked`, listing the cause in
  `debts` with `resolvingOwner` `operator`.
- No case is matrix-shaped.

**Held elsewhere, so no case is written for it.**

- Dispatch only under `prototype_decision_needed`, and the refusal of a
  `blocked` result that lists a repairable finding: spec-0018's.
- `iterate`, `certify` and the standalone loop are unchanged, and keep their
  existing cases.
- The 800-line `SKILL.md` ceiling: the doctor line budget.

**Order.** The four `L3` rows are tier 2 of spec-0018 `10_Plan.md`
`### Order in which the rows go green`, and land before spec-0018's journeys. The
prototype variant waits on them, and the E2E row closes at tier 5.

**Findings carried on purpose.** Pushes follow spec-0018 `10_Plan.md`
`### Findings carried on purpose`.

| Finding                                                                                    | Why it is expected                                                   | Until                                                                                                               |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `QFAI-ATDD-111` for US-0012-0144                                                           | Its journey variant does not exist yet                               | The spec-0018 prototype variant lands                                                                               |
| `QFAI-ATDD-112` for TC-0012-0489..0492                                                     | Their integration tests do not exist yet                             | ATDD writes them                                                                                                    |
| The eight pinned `QFAI-TDDLIST-017` groups, and the 415 `tdd` errors of `tdd/test-list.md` | Pinned rows this change does not repair; the new rows add to neither | A later change                                                                                                      |
| `QFAI-ATDD-131` on this spec, pinned at 1 under `full`                                     | The spec has no Coverage Depth Matrix                                | ATDD writes the first one, and that push re-pins with `node scripts/check-dogfood-backlog.mjs --profile full --pin` |

TDD-0561 stays unused: an approved Change Request that is not yet applied
reserves it.

## v1.9.2 Second-Wave maintenance steps (How-only)

- REQ-0150 (`--emit-skeletons`, DR-0261 / DR-0273): in `cli/lib/args.ts` parse `--emit-skeletons` (boolean, opt-in) and `--skeleton-mode full|placeholder|stub` (default `placeholder`); in `core/prototyping/skeletonEmit.ts` (new) emit one token-styled placeholder HTML per `frozenSurfaceUnion` `screens[].id` reading DESIGN.md tokens, NO per-screen LLM call at cycle 0; ensure the convergence path populates `evidenceRefs[]` with both `screenshot` and `html` kinds for every union screen. Default (flag absent) preserves v1.9.1 emit path.
- REQ-0151 (DESIGN.md patch-zone, DR-0262): parse the front-matter `patch_zone:` block in `core/prototyping/designMdLock.ts`; split the lock into `majorHash` + `patchHash`; compute the edit diff and classify in-zone vs out-of-zone; emit `R-DESIGN-MD-PATCH-OUT-OF-ZONE` (warning) from the reviewer-gate path on out-of-zone edits. No new lock-file artifact.
- REQ-0152 (`prototyping.mode`, DR-0263): extend `QfaiConfig` with `prototyping.mode?: "convergence" | "exploration"`; parse `--mode` in `cli/lib/args.ts` (overrides config; default `convergence`); record `prototyping.json#mode` per iteration; apply the medium gate-relaxation table in the validator dispatch (downgrade `QFAI-CRIT-008` + design-compliance error → warning; structural / path / license stay hard); make `cli/commands/prototypingCertify.ts` reject any exploration-mode iteration with `R-EXPLORATION-CERTIFY-ATTEMPT` and constrain `acceptedIterationIndex` to convergence-mode iterations.
- REQ-0162 (`taskFidelity` keywords): widen the `QFAI-CRIT-009` error text to name every required keyword + section; enumerate the keyword set in `references/evidence-requirements.md` (SSOT); emit the keyword placeholders from the `iterate --capture` template path.
- REQ-0165 (mutation-log): add `core/prototyping/mutationLog.ts` exposing an append-only writer that records `{ ts, caller, path, action, priorSize, newSize }` to `.qfai/evidence/prototyping/mutation-log.jsonl`; call it from every destructive mutation in `iterate` / `certify` (including each `--cycle 0 --force` move); add the path to the shipped `.gitignore`; emit `R-EVIDENCE-MUTATION-UNLOGGED` (error) from the reviewer-gate path when an iter-NN mutation lacks a writer call.

## Deferred follow-ups

Items deferred from this PR (CHG-002 / v1.8.10) — each pairs a planned TDD
with the status / target / owner in `tdd/test-list.md`. Reviewers and
completion gates SHOULD treat the absence of a row here as "closed".

| TDD-ID   | TC-Ref       | Status | Owner           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ------------ | ------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD-0384 | TC-0012-0377 | todo   | prototyping-cli | Per-spec iter-dir layout migration (iterate-side; certify-side already gates on per-spec).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| TDD-0401 | TC-0012-0374 | todo   | prototyping-cli | Reviewer Playwright session failure hard-stop end-to-end (requires live Playwright wiring).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| TDD-0402 | TC-0012-0383 | todo   | prototyping-cli | Reviewer-driven menu-entry navigation count (requires live Playwright wiring).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| TDD-0436 | TC-0012-0416 | done   | prototyping-cli | Cycle 9 idempotency: `--cycle 9` on a non-converged loop with `iterations.length === 10` emits exit 65 directly via the `shouldStop` "max-iterations" branch (last.index >= MAX_ITERATION_INDEX), never falling through to the expectedNextCycle gate (which would have returned exit 2 cycle-mismatch). Regression test pins exit code 65, asserts info channel matches `/max iterations \(10\) reached/`, and asserts error channel does NOT match `/expected --cycle 10/`. Landed in v1.9.0 — no production code change required (correctness flowed from `shouldStop` running BEFORE the expectedNextCycle gate at `prototypingIterate.ts:1353` vs `:1437`). |

Coupled production wire-ins (no production caller yet; tests-only):

- `iterationPaths.ts` per-spec helpers — wire in alongside TDD-0384.
- `reviewerDispatch.ts` — wire in alongside TDD-0401 (production runner injection).
- `evaluatorReview.ts#parseEvaluatorReview` — wire in the same wave as TDD-0384 so per-`(spec, screen)` review.json schema fails fast at iterate/certify.
- `handoff.ts#validateImageSources` — wire in once the prototype-handoff.yaml population path lands; until then `licenseVerify` consumes `prototyping.json#imageSources` directly.

## NFR approach

- NFR-0001..0010 are unchanged by this entry: a prototype stage inside a run uses the same loop, budgets and evidence layout.

### Intent-driven entry (CAP-0018)

- `discussion-20260923171450572#NFR-0002` (asset ceiling): the new `qfai-prototyping/references/orchestrated-mode.md` and the one citation line (`SKILL.md` 535 → 536) stay within 800 lines and 400 characters per line. A breach shows in the `assets.lineBudget` doctor check and `packages/qfai/src/core/doctor/assetLineBudget.ts`.
- `discussion-20260923171450572#NFR-0015` (distributed surface): the new reference carries no internal identifier. A breach shows in the pre-build shipping lint, the post-build leakage guard or the init smoke test (`.agents/rules/distributed-surface.local.md` `## Four guards`).

## Risk mitigation

| Risk                                                                                                                                  | Likelihood / impact | Mitigation                                                                                                                                                                     | Trigger to act                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| The cycle budget is edited in a validator or a fixture instead of the single SSOT, so 10 and 15 coexist in the tree                   | med / high          | `MAX_ITERATIONS` / `MAX_ITERATION_INDEX` in `core/prototyping/iteration.ts` are the sole SSOT; the purge removes 15-magic from validators and fixtures atomically              | Any literal cycle count appears outside `iteration.ts`              |
| The iter-dir layout is mixed — certify reads per-spec, iterate still writes flat — so evidence is written where certify will not look | high / high         | The mixed state is recorded rather than hidden (TDD-0384 is the migration row); certify gates on per-spec presence so the gap fails loudly                                     | Evidence is reported missing for a spec whose screens were reviewed |
| A stock-photo fill lands with an unknown or non-allowlisted licence and ships in the handoff                                          | low / high          | `licenseVerify` runs against the cycle-0 frozen catalogue and hard-stops with exit 66; every fill records `{url, license, attribution, source}`                                | A fill appears with no `license` field                              |
| Qualitative convergence is relaxed back into a numeric threshold because it is easier to compute                                      | med / high          | Convergence is the AND over `(spec, screen)` of all four axes exceptional plus empty `lap[]` and `designMdViolations[]`; the quantitative surfaces were purged, not deprecated | A pass-percentage appears anywhere on the convergence path          |
| A destructive mutation runs unlogged, so an evidence tree cannot be reconstructed after a `--cycle 0 --force`                         | med / med           | `mutationLog.ts` is an append-only writer called from every destructive mutation; `R-EVIDENCE-MUTATION-UNLOGGED` (error) fires when one is missing                             | An iter-NN mutation lands with no writer call                       |

### Intent-driven entry (CAP-0018)

| Risk                                                                                       | Likelihood / impact | Mitigation                                                                                                                             | Trigger to act                                                                                                   |
| ------------------------------------------------------------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A prototype stage whose target has no UI surface writes the project's first surface signal | low / high          | Under a work order whose target spec is not UI-bearing, the skill writes nothing and returns `blocked` naming the cause (BR-0012-0138) | A new `surface_type`, `DESIGN.md` or UI contract after a run, or `resolveSurfaceUnion` returning a non-empty set |
