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

### Story-tree layout

The unit of a prototyping run becomes the UI contract `CON-UI-NNNN`
(`.qfai/contracts/cli/qfai-prototyping.md#story-tree-layout`). spec-0012 has no
work in P1 to P5. Its work lands in two places in the delivery order:

1. **P6: the prototype directory.** `.qfai/prototypes/` becomes
   `.qfai/prototype/` (BR-0012-0047). The rest of the P6 co-change that the
   Triage row lists (links, citations, `skillsDir`) belongs to the P6 change as
   a whole. spec-0012's part is the three code sites below and the prototyping
   skill and agent text.
2. **P7: the unit, the design lock, and the REMOVE row.** These land together
   with the tests that prove them, in the P7 cutover:
   - The unit becomes the UI contract (N36 to N38).
   - The lock is frozen at the `/qfai-sdd` 03-contract step (BR-0012-0026).
   - The lock is read from `<paths.contractsDir>/design/` (BR-0012-0027).
   - EX-0012-0147, EX-0012-0152 and EX-0012-0158 are removed with
     TC-0012-0418, TC-0012-0423 and TC-0012-0429.
   - Every clause that holds "in the spec-pack layout" is dropped from the
     items, as OQ-0170 records.

Neither phase opens a window in which the code reads both layouts (N05, N36). A
`prototyping.json` written before the change is refused and re-seeded rather
than read.

| Module                                                                                                                                                                                             | Phase | Change                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/qfai/src/core/prototyping/paths.ts`                                                                                                                                                      | P6    | One constant for `.qfai/prototype`, beside `PROTOTYPING_EVIDENCE_REL`                                                                                                                                                                                                                                                                                                                                                                      |
| `packages/qfai/src/core/prototyping/defaultServerRunner.ts`                                                                                                                                        | P6    | The `--auto-serve` root is built from that constant                                                                                                                                                                                                                                                                                                                                                                                        |
| `packages/qfai/src/core/prototyping/specResolution.ts`                                                                                                                                             | P7    | Rewritten in place. It resolves UI-bearing `CON-UI-NNNN` files: the ID comes from `contractsDecl.ts#extractDeclaredContractIds`, which the contract index already uses, and whether a file carries screens comes from `screenContracts.ts#readUiContractScreenContracts`. The spec-level signals go: the `surface_type` marker, `TITLE_MARKER_RE` and spec-named contract files. The exports keep their callers and return UI contract IDs |
| `packages/qfai/src/core/prototyping/specsCovered.ts`                                                                                                                                               | P7    | Rewritten in place as the one reader of `uiContractsCovered`. It runs the fail-closed checks and the canonical `CON-UI-NNNN` check before any path is built. It also recognises a record written before the change. The two-source precedence and the legacy readers are deleted                                                                                                                                                           |
| `packages/qfai/src/core/prototyping/primarySpecIdParse.ts`                                                                                                                                         | P7    | Rewritten in place to accept only the full `CON-UI-NNNN` form. Normalisation is deleted                                                                                                                                                                                                                                                                                                                                                    |
| `packages/qfai/src/core/prototyping/iterationPaths.ts`                                                                                                                                             | P7    | The per-unit helpers descend into `CON-UI-NNNN/` and keep the `/^iter-\d{2,}$/` cleanup                                                                                                                                                                                                                                                                                                                                                    |
| `packages/qfai/src/core/prototyping/certificate.ts`                                                                                                                                                | P7    | `uiContractsCovered`, `convergedUiContracts[]` and `laggingUiContracts[]`                                                                                                                                                                                                                                                                                                                                                                  |
| `packages/qfai/src/core/prototyping/frozenScope.ts`                                                                                                                                                | P7    | The live and frozen unions hold `CON-UI-NNNN` IDs, read through the resolver                                                                                                                                                                                                                                                                                                                                                               |
| `packages/qfai/src/cli/commands/prototypingIterate.ts`                                                                                                                                             | P6/P7 | P6: the capture source directory comes from the constant. P7: `--primary-ui-contract`, the cycle-0 freeze writes only `uiContractsCovered`, a record written before the change exits 2 at cycle ≥ 1, the re-seed keeps `iter-NN/spec-NNNN/`, and the lock messages name the 03-contract step                                                                                                                                               |
| `packages/qfai/src/cli/commands/prototypingCertify.ts`                                                                                                                                             | P6/P7 | P6: the authored-path message comes from the constant. P7: certify runs per UI contract, `show-spec` becomes `show-ui-contract`, a record written before the change exits 2, and the lock message names the 03-contract step                                                                                                                                                                                                               |
| `packages/qfai/src/cli/commands/prototypingRescope.ts`                                                                                                                                             | P7    | Follows `frozenScope.ts`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `packages/qfai/src/cli/lib/args.ts`, `packages/qfai/src/cli/main.ts`                                                                                                                               | P7    | The flag and the sub-command are renamed, and so is the help text                                                                                                                                                                                                                                                                                                                                                                          |
| `packages/qfai/src/cli/lib/exitCodes.ts`                                                                                                                                                           | P7    | The `prototyping show-spec` exit-code label becomes `prototyping show-ui-contract`                                                                                                                                                                                                                                                                                                                                                         |
| `packages/qfai/src/core/config.ts`                                                                                                                                                                 | P7    | `prototyping.primaryUiContract` replaces `prototyping.primarySpecId`, full form only                                                                                                                                                                                                                                                                                                                                                       |
| `packages/qfai/src/core/validators/prototypingEvidence.ts`, `packages/qfai/src/core/report.ts`, `packages/qfai/src/core/doctor.ts`, `packages/qfai/src/core/validators/designContractReadiness.ts` | P7    | Callers of the resolver, updated in the same commit                                                                                                                                                                                                                                                                                                                                                                                        |
| `packages/qfai/assets/init/.qfai/assistant/skill/qfai-prototyping/**`                                                                                                                              | P6/P7 | P6: `.qfai/prototype`. P7: the UI contract is the unit (BR-0012-0051), `<contractsDir>/design/`, and the 03-contract step                                                                                                                                                                                                                                                                                                                  |

**No new architectural element.** The resolver, the frozen-set reader and the
pin parser already exist. Each is rewritten where it is and keeps the callers it
has. `specResolution.ts` alone has eight importing modules today.

**One shared value** is added: the prototype directory constant in `paths.ts`.
Three modules read it, each for a different usage:

1. The capture source copy in `prototypingIterate.ts` (BR-0012-0047,
   EX-0012-0168).
2. The `--auto-serve` root in `defaultServerRunner.ts`
   (`.qfai/contracts/cli/qfai-prototyping-iterate.md#story-tree-layout`).
3. The authored-path message in `prototypingCertify.ts`
   (`.qfai/contracts/cli/qfai-prototyping.md#the-prototype-directory`).

**Alternatives rejected:**

- **Read the old record fields during a transition window.** Rejected by N36
  and N05: a record written before the change is exit 2 with a re-seed
  instruction.
- **Add a UI-contract resolver module beside `specResolution.ts`.** Rejected
  because every caller would then carry two resolvers until the old one is
  deleted, and the old one serves no layout after P7.
- **Keep normalising a bare `NNNN` for the pin.** Rejected by BR-0012-0055: on
  the story tree only the full `CON-UI-NNNN` form is accepted.

**The re-seed over an old record.** Today `--cycle 0 --force` moves `iter-00`
aside, and `clearEvidenceIterDirs` in `prototypingIterate.ts` deletes
`iter-01` onward. On the story tree the re-seed deletes none of the evidence
under `iter-NN/spec-NNNN/` (AC-0012-0065, BR-0012-0053). The mechanism is the
implementation's choice. Whatever it moves goes through `mutationLog.ts` like
every other destructive mutation.

**Recorded drift.** These defects are recorded and not fixed under these Triage
rows (X11). Where item text disagrees with the contract or with a fuller item,
the implementation follows the contract and the fuller item.

- REQ-0012-0078 says `--check-convergence` reads
  `.qfai/prototypes/iter-09/prototyping.json`. The record lives at
  `PROTOTYPING_JSON_REL` (`.qfai/evidence/prototyping/prototyping.json`).
- The `## Entry points` ranges in `01_Spec.md` stop well short of the IDs the
  spec holds.
- AC-0012-0037 and BR-0012-0028 do not name the `# … prototyping …` title
  signal that the resolver reads today. The story-tree clause drops it either
  way.
- BR-0012-0034 lists hard-stop classes (a) to (d), while AC-0012-0045 lists (a)
  to (h). Tests key on AC-0012-0045.
- `prototypingIterate.primarySpecIdError.test.ts` and
  `spec0012PrototypingRemediationE2E.test.ts` pin the old `primarySpecId`
  message and its normalisation. They are P7 co-changes.

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

### Story-tree layout

The existing TCs keep their text until the P7 commit. That commit rewrites each
one together with the test that proves it, and re-verifies its ledger row (X2).
The tests that annotate TC-0012-0418, TC-0012-0423 and TC-0012-0429 are deleted
there, and TDD-0438, TDD-0443 and TDD-0449 are tombstoned. The fixtures are
`mkdtemp` projects holding `<contractsDir>/ui/*.yaml` UI contracts.

| Layer          | Where                                                                                                                                | What it proves                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1 Unit        | `packages/qfai/tests/core/prototyping/*.test.ts`, `packages/qfai/tests/unit/cli/commands/prototypingIterate.*.test.ts`               | The resolver on contract trees (BR-0012-0009, BR-0012-0028). The `uiContractsCovered` reader and the old-record check (BR-0012-0034, BR-0012-0038). The full-form pin parser (BR-0012-0055). The per-unit path helpers (BR-0012-0035). The certificate fields (BR-0012-0036) |
| L3 Integration | `packages/qfai/tests/cli/commands/prototyping*.test.ts`, `packages/qfai/tests/integration/cli/commands/prototypingIterate.*.test.ts` | `iterate`, `certify` and `show-ui-contract` run end to end in a project: freeze, drift gate, old-record refusal, re-seed, per-UI-contract certify, pin precedence, and the P6 serve and capture directories                                                                  |
| L5 E2E         | `packages/qfai/tests/e2e/prototypingE2E.test.ts`, `packages/qfai/tests/e2e/spec0012PrototypingRemediationE2E.test.ts`                | The loop from cycle 0 to the certificate on a story-tree fixture                                                                                                                                                                                                             |

L2 and L4 have nothing to prove here: prototyping has no component seam and no
HTTP API.

These boundaries each need their own case:

- **The pin's input form.** A bare `NNNN`, `spec-0001`, `con-ui-0001`,
  `CON-UI-001` and `CON-API-0001` are each exit 2, through the flag and through
  the config key. The message names the `CON-UI-NNNN` shape and the input
  received. When both are set, the flag wins (AC-0012-0067).
- **A path-traversal entry in `uiContractsCovered`.** For example
  `CON-UI-0001/../x`: it is refused before any review path is built, and the
  case asserts that nothing was read or created outside the evidence root
  (AC-0012-0045 (g), EX-0012-0154).
- **A record written before the change.** Three shapes: it carries
  `specsCovered`, it carries `frozenSpecsCovered`, or it lacks
  `uiContractsCovered`. Each shape is refused by each of `iterate` at cycle ≥ 1,
  `certify` and `show-ui-contract`. A shared case would pass while one command
  still read the old field (N36).
- **Absent against malformed.** A malformed `uiContractsCovered` is exit 2 with
  the "present but malformed" diagnostic. An absent one is the old-record path.
  No fallback to a second field exists (EX-0012-0155).
- **The re-seed over an old record.** Every byte under `iter-NN/spec-NNNN/` is
  still readable after `--cycle 0 --force` (AC-0012-0065, TC-0012-0449,
  TC-0012-0465).
- **What counts as UI-bearing** (AC-0012-0009, AC-0012-0037):
  - an ID with no `screens[]`: not UI-bearing
  - `screens[]` with no ID: not UI-bearing
  - a spec carrying `surface_type: ui-bearing` with no contract: not UI-bearing
  - a spec-named `ui/spec-0001.yaml` with no ID: not UI-bearing
  - a `.yml` contract: UI-bearing
  - two contracts whose screen IDs collide
- **Zero UI-bearing contracts.** At cycle 0 this is a no-op, exit 0. At cycle
  ≥ 1 it is drift, exit 2 (EX-0012-0123).
- **The prototype directory.** The fixture holds both `.qfai/prototypes/` and
  `.qfai/prototype/`, so a leftover old directory cannot satisfy the serve or
  capture case (EX-0012-0168).
- **The lock messages.** They name the `/qfai-sdd` 03-contract step and read
  `<paths.contractsDir>/design/DESIGN.md.lock.yaml`, with `contractsDir` set to
  a non-default value (AC-0012-0035).

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

On the story tree, each floor in `01_Spec.md#Applicable NFR` that the change
touches is kept per UI contract. The floors it does not touch are met as the
sections above describe.

- **NFR-0004, 5 minutes per UI contract per cycle.** An overrun is recorded in
  `softWarnings.timeBudget` on the review payload of that UI contract.
  - Breach: a fixture cycle held past the budget writes no soft warning, or
    writes one keyed by a spec ID (TC-0012-0387).
- **NFR-0006, all evidence under `iter-NN/CON-UI-NNNN/`.** After a fixture
  cycle, the case lists `iter-NN/` and requires the review payloads there.
  - Breach: a review payload anywhere other than a `CON-UI-NNNN/` directory,
    or `findIterationReviewFiles` returning a path outside one.
- **NFR-0008, no stdin prompt.** A record written before the change, a bad pin
  and a malformed or drifted lock each end in exit 2 with a message, never a
  question.
  - Breach: the no-prompt fixture with stdin closed does not exit, or exits 0,
    on any of the three.

## Risk mitigation

| Risk                                                                                                                                  | Likelihood / impact | Mitigation                                                                                                                                                                     | Trigger to act                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| The cycle budget is edited in a validator or a fixture instead of the single SSOT, so 10 and 15 coexist in the tree                   | med / high          | `MAX_ITERATIONS` / `MAX_ITERATION_INDEX` in `core/prototyping/iteration.ts` are the sole SSOT; the purge removes 15-magic from validators and fixtures atomically              | Any literal cycle count appears outside `iteration.ts`              |
| The iter-dir layout is mixed — certify reads per-spec, iterate still writes flat — so evidence is written where certify will not look | high / high         | The mixed state is recorded rather than hidden (TDD-0384 is the migration row); certify gates on per-spec presence so the gap fails loudly                                     | Evidence is reported missing for a spec whose screens were reviewed |
| A stock-photo fill lands with an unknown or non-allowlisted licence and ships in the handoff                                          | low / high          | `licenseVerify` runs against the cycle-0 frozen catalogue and hard-stops with exit 66; every fill records `{url, license, attribution, source}`                                | A fill appears with no `license` field                              |
| Qualitative convergence is relaxed back into a numeric threshold because it is easier to compute                                      | med / high          | Convergence is the AND over `(spec, screen)` of all four axes exceptional plus empty `lap[]` and `designMdViolations[]`; the quantitative surfaces were purged, not deprecated | A pass-percentage appears anywhere on the convergence path          |
| A destructive mutation runs unlogged, so an evidence tree cannot be reconstructed after a `--cycle 0 --force`                         | med / med           | `mutationLog.ts` is an append-only writer called from every destructive mutation; `R-EVIDENCE-MUTATION-UNLOGGED` (error) fires when one is missing                             | An iter-NN mutation lands with no writer call                       |

### Story-tree layout

| Risk                                                                                                                                                                                                                                                    | Likelihood / impact | Mitigation                                                                                                                                                                           | Trigger to act                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A rename is missed. About 59 TCs change text at P7, 46 test files name the renamed surface, and the resolver has eight importing modules                                                                                                                | med / high          | The P7 commit rewrites each TC with its test (X2). The Phase 4 delta lists the TCs per Triage row. The resolver keeps its callers, so the compiler finds every call site             | `grep -rnE "specsCovered\|frozenSpecsCovered\|show-spec\|--primary-spec-id"` over `packages/qfai/src` and the shipped `qfai-prototyping` skill is non-empty after the P7 commit |
| The re-seed over an old record deletes evidence. Today `clearEvidenceIterDirs` removes `iter-01` onward                                                                                                                                                 | med / high          | The P7 change keeps everything under `iter-NN/spec-NNNN/`. Any move goes through `mutationLog.ts`. The re-seed cases check the bytes afterwards                                      | A file under `iter-NN/spec-NNNN/` is missing after the re-seed case, or the mutation log records a delete under a `spec-NNNN/` path                                             |
| `readUiContractScreenContracts` keeps the first entry of a repeated screen ID. A UI contract whose every screen ID repeats an earlier file's then reads as carrying no screens, and drops out of `uiContractsCovered`                                   | low / med           | A boundary case of its own. `findUnreadUiScreenEntries` already reports the dropped entries in validate                                                                              | The colliding-screen fixture resolves one UI contract where it declares two                                                                                                     |
| Implementers build from stale item text: the REQ-0012-0078 record path, or the four classes BR-0012-0034 lists where AC-0012-0045 has eight                                                                                                             | med / med           | The drift is recorded above and not fixed under these rows (X11). Code reads `PROTOTYPING_JSON_REL`. The class cases key on AC-0012-0045                                             | A `--check-convergence` case or implementation names `iter-09/prototyping.json`, or a class (e) to (h) case is missing for `uiContractsCovered`                                 |
| Tests that pin the old pin message break at P7: `prototypingIterate.primarySpecIdError.test.ts`, `prototypingIterate.primarySpecIdNormalise.test.ts` and `spec0012PrototypingRemediationE2E.test.ts`. So do the three lock messages that name "Phase 0" | high / low          | They are P7 co-changes in the same commit as `primarySpecIdParse.ts` and the lock messages                                                                                           | Any of them still asserts normalisation or "Phase 0" after the P7 commit                                                                                                        |
| Readers of `primarySpecId` that no item names are left behind: the `QFAI-CFG-LINK-001` check in `configReferenceIntegrity.ts`, the optional `primarySpecId` field in `schemas/handoff.ts`, and `prototyping rescope --remove <NNNN>`                    | med / med           | Recorded as a gap and registered as OQ-0183, settled before the P7 commit rather than in this plan                                                                                   | The P7 commit renames the config key while `configReferenceIntegrity.ts` still reads `prototyping.primarySpecId`                                                                |
| A `.qfai/prototypes` literal survives P6 in code or shipped text                                                                                                                                                                                        | low / med           | The three code sites read one constant. The skill and agent text is swept in the same commit. Migration step 1 and its tests keep naming the old directory, since it is their source | `grep -rn "\.qfai/prototypes"` over `packages/qfai/src` and `packages/qfai/assets/init` finds anything outside the migration's rename map after P6                              |
