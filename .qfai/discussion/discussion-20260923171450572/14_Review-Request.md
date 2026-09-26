# 14 Review Request

## Scope

- scope: `discussion-20260923171450572`
- layer: `discussion`
- review-pack: `assigned per review cycle` — see `.qfai/review/`

<!-- Do NOT record a single review-pack id here. `references/review-cycle-playbook.md`
     requires a new review pack per cycle, so one discussion pack is reviewed by N packs.
     The authoritative pointer for a given cycle is that pack's own
     `.qfai/review/review-YYYYMMDDhhmmssSSS/review_request.md#Scope`, which names the directory that
     contains it. -->

- Subject: plan qfai 1.13.0 around a free-text entry (`qfai-run`) and a CLI control core (`npx qfai workflow`) that runs the existing skills as orchestrated stages.
- Classification: UI-bearing, `primary_surface: cli`, no secondary surface (`01_Context.md` `## UI-bearing Classification`). The pack is cli-only: no design direction, no brand registry, no `DESIGN.md`.
- Repository state read by the authors: HEAD `ccca63a7a`, `packages/qfai/package.json` version `1.12.2`.

## Target Files

- `.qfai/discussion/discussion-20260923171450572/01_Context.md`
- `.qfai/discussion/discussion-20260923171450572/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260923171450572/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260923171450572/04_Sources.md`
- `.qfai/discussion/discussion-20260923171450572/05_Scope.md`
- `.qfai/discussion/discussion-20260923171450572/06_REQ.md`
- `.qfai/discussion/discussion-20260923171450572/07_NFR.md`
- `.qfai/discussion/discussion-20260923171450572/08_Glossary.md`
- `.qfai/discussion/discussion-20260923171450572/09_Constraints.md`
- `.qfai/discussion/discussion-20260923171450572/10_Policy.md`
- `.qfai/discussion/discussion-20260923171450572/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260923171450572/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260923171450572/13_Deferred.md`
- `.qfai/discussion/discussion-20260923171450572/14_Review-Request.md`
- `.qfai/discussion/discussion-20260923171450572/99_delta.md`
- `.qfai/discussion/discussion-20260923171450572/uiux/00_index.md`
- `.qfai/discussion/discussion-20260923171450572/uiux/40_screen_contracts.md`
- `.qfai/discussion/discussion-20260923171450572/uiux/50_review_input_bundle.md`

Supporting inputs, read but not reviewed as pack content:

- Stage evidence: `.qfai/evidence/discussion-20260923171450572.md` — `## Grilling Session` row and `## Research Summary`.
- Session record: `tmp/idd-discussion/decisions.md` (D1 to D16 from the grilling session, F1 to F3, and D17 and D18, which the user answered during review), restated in `99_delta.md` `## Change History`.
- Design package (SRC-0001): `tmp/idd-discussion/QFAI_Intent_Driven_Architecture_20260923.md` and `tmp/idd-discussion/package/`.
- Research notes: `tmp/idd-discussion/repo-facts.md`, `tmp/idd-discussion/external-sources.md`, `tmp/idd-discussion/preflight.md`.

## Answered demands

| Finding source                                                               | Demand                                                                                  | Response                                                                                                                                                  | Evidence                                   |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `.qfai/review/review-20260923190113457/R02_requirements-reviewer.md#F-R2-01` | The two-host eval cost is both settled and open                                         | User adjudication, D17: the eval is planned on both hosts; a host with no recorded result is not declared supported in 1.13.0, and spending is not forced | `tmp/idd-discussion/decisions.md`, D17 row |
| `.qfai/review/review-20260923190113457/R03_architecture-reviewer.md#F-01`    | Say how a regression caught by an existing, correct test on a `done` row is handled     | User adjudication, D18: implement fixes the production code against the existing row, which stays `done`                                                  | `tmp/idd-discussion/decisions.md`, D18 row |
| `.qfai/review/review-20260923190113457/R01_completion-reviewer.md#C2`        | The pack-specific focus row on default `active` must state the current fail-closed rule | Fixed in this file: `### Pack-specific focus`, the default-`active` row. Advisory; completion-reviewer confirms next cycle                                | This file, `### Pack-specific focus`       |

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only
- Design direction completeness — skipped: the pack is cli-only (`01_Context.md` `## Design Direction`)
- Reference pool freshness and translation quality into `uiux/40_screen_contracts.md`, and Trend Scan freshness and evidence traceability at `04_Sources.md#Trend Scan`
- Canonical `uiux/` family complete — `00_index.md`, `40_screen_contracts.md`, `50_review_input_bundle.md` — with no forbidden legacy sidecar
- Evaluator scoring covers all four canonical UX axes — information architecture / navigation flow / usability / functionality, fixed by the review validation the QFAI CLI applies (restated in `.qfai/assistant/skills/qfai-prototyping/references/reviewer-prompt.md`)
- Evaluator critique skepticism and blandness rejection quality applied against the four axes
- Planner-first discipline — exploration directions stay unranked, no single visual winner was selected (`qfai-discussion/SKILL.md`), and latest-iteration handling matches the one-lineage / no-best-of-history rule in `qfai-prototyping/SKILL.md`
- Screen contract sufficiency and strong schema completeness
- Generic fallback risk — ensure no unreviewed generic/placeholder UI remains
- OQ register exit condition (open count = 0)
- Deferred items have full metadata

### Pack-specific focus

The solution-architect flagged these in `09_Constraints.md` `## Risks These Constraints Create` and `10_Policy.md`. Each is a decision `/qfai-sdd` inherits, so check that the pack states it precisely enough to be carried there.

| Focus                                                | Where it is stated                                                                                             | What to check                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `finish` runs validation without a shell on Windows  | `09_Constraints.md` DTC-7; REQ-0060; NFR-0013; `10_Policy.md` `## Security Policy`                             | Node will not spawn `npx.cmd` without `shell: true`. The two named routes (in-process validate entry, or `process.execPath` with the package's CLI script) both keep D10 and NFR-0013, and the choice is left to the `workflow` contract.                                                                                                                          |
| Default `active` meets the add-only manifest merge   | `09_Constraints.md` DTC-10, AD-11 row and its risk bullet; `10_Policy.md` DPOL-12; REQ-0059, REQ-0065; OQ-0011 | A customized manifest is not drift by itself: a customization that keeps the required roles stays `active`. A run fails closed only on one of the three drift triggers in REQ-0059 and DPOL-12. Check that every file states the same three triggers, and that the pack says what the operator sees and can do when one fires, or defers it with enough metadata.  |
| No JSON Schema validator dependency                  | `09_Constraints.md` DTC-2 and its risk bullet; `10_Policy.md` `## Development Policy` Sourcing line            | Hand-written parsers for the shipped contracts can drift from their schemas. Check that the sourcing decision is sent to `/qfai-sdd` rungs 2 to 5 and that the test that holds parser and schema together is not assumed away.                                                                                                                                     |
| Schema `$id` and description rewrite before shipping | `09_Constraints.md` DTC-5 and AD-10 row; NFR-0015                                                              | The design's schemas carry `urn:qfai:design:*`, a `contract` constant and Japanese draft descriptions. Check the pack requires version-free, `design`-free `$id` and `contract`, English descriptions, and no internal identifiers.                                                                                                                                |
| D10 trusts `verify.json`                             | `09_Constraints.md` DTC-9 and its risk bullet; REQ-0060, REQ-0063; `99_delta.md` D10 row                       | The core does not prove tests ran. Check the pack states this as an accepted departure from design 05 §10, names the qa-gatekeeper review as the check, and binds the file to the run's verify stage instance.                                                                                                                                                     |
| Linux-only CI against the Windows journal and lock   | `09_Constraints.md` DTC-16 and its risk bullet; NFR-0010, NFR-0011; OQ-0012                                    | Journal publish and lock are the parts most likely to differ on Windows, and crash consistency depends on them. Check that Windows results are a release condition and that OQ-0012 is owned and deferred with its gate.                                                                                                                                           |
| Decisions the user made during review                | `tmp/idd-discussion/decisions.md`, D17 and D18 rows                                                            | D17: the pack claims "supported" only for a host with a recorded eval result, and REQ-0058, REQ-0066, DSC-004 and OQ-0014 agree. D18: a regression caught by an existing, correct test is fixed in production code, the `done` row keeps its status, and the re-run and review are recorded in the run evidence. Check both land in `06_REQ.md` and `99_delta.md`. |

### Architecture-affecting decisions

For `architecture-reviewer`. Each departs from, or narrows, the design package; the departure is stated in `99_delta.md` and `09_Constraints.md` `## Architecture Decisions Carried From the Design`.

- CLI control core: seven operations, no `exec`, no command registry (D2, D9; DTC-1, DTC-7).
- Run state: `.qfai/runs/<runId>/` ignored, sanitized evidence under `.qfai/evidence/workflow/<runId>/` tracked, `.qfai/state.json` unused (D11; DTC-8, DTC-11).
- Authorization binding: one routing-time `human_decision` for a CREATE, checked rather than re-asked at SDD Stage 1 (D5; DPOL-03, DPOL-04; REQ-0043).
- Init and migration: default `active`, add-only manifest merge, provenance-checked asset updates (D7; DTC-10; REQ-0064, REQ-0065).
- Bugfix path without `defect-reopen`: a new row through Phase 2b, a test-only fix that leaves status untouched, and a production-code fix against an existing `done` row (D6, D13, D14, D18).

## Exploration Direction Consistency

<!-- Required for UI-bearing packs. Verifies design direction and sidecar alignment. -->

- Design direction: skipped. The pack is cli-only, so `04_Sources.md` records no brand personality or reference registries. Verify instead that `01_Context.md` `## Design Direction` says so and that nothing in the pack presents a visual direction.
- Evaluator axes: confirm reviewers will score against the four canonical UX axes (information architecture / navigation flow / usability / functionality) — these are fixed by the review validation the QFAI CLI applies (restated in `.qfai/assistant/skills/qfai-prototyping/references/reviewer-prompt.md`) and no longer authored as sidecar files
- History handling: verify `uiux/50_review_input_bundle.md` matches the one-lineage rule in `qfai-prototyping/SKILL.md` — no parallel candidates, no best-of-history, the latest iteration is accepted

## Sidecar Artifact Review Scope

<!-- Required for UI-bearing packs. Reviews the recorded design direction (visual-prototyping surfaces) + uiux/ sidecar artifacts (every UI-bearing surface, cli included). -->

- Design direction specificity: skipped on this cli-only pack.
- Verify `uiux/50_review_input_bundle.md` states the one-lineage handling (latest iteration accepted, no best-of-history)
- Verify screen contracts use nested strong schema with all 4 required states (default/loading/empty/error) and treat `uiux/40_screen_contracts.md` as the state SSOT
- Verify each screen contract's `route:` follows the convention the file states at its top, that a command route reads `npx qfai workflow …` and never a bare `qfai` (DTC-6), and that terminal accessibility (NFR-0012, NFR-0017) is checked there.

## Required Reviewers

- Resolve reviewers from `.qfai/assistant/manifest/agent-routing.yml` and `.qfai/assistant/manifest/review-profiles.yml`.
- Always run reviewers listed in `profiles.<routing_profile>.always_required` in `review-profiles.yml`.
- Add `architecture-reviewer` only when architecture-affecting decisions exist.
- Add `product-surface-reviewer` only when the pack is UI-bearing.
- Allowed in-flight verdicts: `PASS`, `REVISE`. `REVISE` is what starts the fix-and-rerun cycle; it serializes to `status: "FAIL"` when the pack's `summary.json` is written (see `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#verdict-vocabulary`).

Resolved for this pack: `agent-routing.yml` skill `qfai-discussion`, phase `review`, `review_profile: requirements-heavy`.

| Reviewer                   | Routing             | Why routed                                                                                           | What to check                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `completion-reviewer`      | mandatory, blocking | `always_required` of `requirements-heavy`                                                            | `qfai-discussion/SKILL.md` `### Reviewer Gate (MUST)`: 15 files and three sidecars present; `Disposition: open` = 0 in `11_OQ-Register.md`; `13_Deferred.md` matches every deferred OQ; the evidence's `## Grilling Session` row ends `confirmed` with `Ended at` before `Authoring began`; the review pack has its three artifacts; Drift Protocol. |
| `requirements-reviewer`    | mandatory, blocking | `always_required` of `requirements-heavy`                                                            | `06_REQ.md` and `07_NFR.md` are testable and do not overlap; every decision D1 to D16 lands in a REQ, NFR, policy or deferred OQ; each repository fact names a locator that opens, and the locator says what the pack claims; scope in `05_Scope.md` stays inside the request.                                                                       |
| `architecture-reviewer`    | conditional, added  | Architecture-affecting decisions: CLI control core, run state, authorization binding, init/migration | `### Architecture-affecting decisions` and `### Pack-specific focus` above, against `09_Constraints.md` and `10_Policy.md`; each departure from the design is stated with its reason.                                                                                                                                                                |
| `product-surface-reviewer` | conditional, added  | UI-bearing, `cli` only                                                                               | The `uiux/` family, `## Sidecar Artifact Review Scope` above, the four UX axes against the terminal surface, and that no visual direction was invented for a cli-only pack.                                                                                                                                                                          |

## RCP Rules (Mandatory)

- Blocking feedback triggers immediate return (`changes_requested`). Reports
  alone do not reopen an answered demand, and advice a reviewer marks
  non-normative under
  `.qfai/assistant/constitution/review-convergence.md#discussion-review-precision`
  is recorded and carried to the stage that implements the change rather than
  returning the pack.
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
- The cycle follows `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`, including its validate hard gate: `npx qfai validate --profile discussion --fail-on error --format github`, with `.qfai/report/validate.log` pointing at the latest `run-*/`.
