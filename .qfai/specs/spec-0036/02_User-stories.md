# 02 User Stories

## US Catalog

- US-0036-0001: Render Evidence Wiring (D-10)
- US-0036-0002: Browser QA MVP (D-11)
- US-0036-0003: All 4 Browser QA Phases Produce Real Findings (v1.7.11 Completion)

## US-0036-0001: Render Evidence Wiring

- Parent: CAP-0036
- Deliverable: D-10
- REQs: REQ-0020, REQ-0021
- Goal: As a prototyping evidence consumer, I want the CLI path for render evidence to report capture/skip/fail honestly, so that placeholder "not implemented" is removed and I receive structured, honest results
- Non-goals: Implementing new screenshot capture tooling, visual regression testing
- Notes:
  - Replace placeholder "not implemented in this slice" in `packages/qfai/src/cli/commands/prototyping.ts`
  - Structured result must include status: captured / skipped / failed with reasons
  - OQ-0006 decision: when capture is impossible, report skipped + reason + alternative suggestion (not error abort)
  - Partial capture reports failed items alongside captured items

## US-0036-0002: Browser QA MVP

- Parent: CAP-0036
- Deliverable: D-11
- REQs: REQ-0022, REQ-0023
- Goal: As a QA workflow consumer, I want the smoke phase of browser QA to return real findings, so that the QA runner functions as an operational quality loop
- Non-goals: Interaction phase implementation, accessibility phase implementation, full 4-phase QA pipeline
- Notes:
  - `core/browserQa/runner.ts` smoke phase must return non-empty findings
  - Visual phase (should priority) also returns real findings
  - OQ-0002 decision: smoke + visual MVP scope for v1.7.8
  - No-URL case must return structured error, not empty findings

## US-0036-0003: All 4 Browser QA Phases Produce Real Findings (v1.7.11 Completion)

- Parent: CAP-0036
- REQs: REQ-0016, REQ-0017, REQ-0018
- Source: DR-0104
- Goal: As a QA workflow consumer, I want all 4 browser QA phases (smoke, visual, interaction, accessibility) to produce real findings from actual analysis, so that the QA runner is fully operational and foundation-only placeholders are eliminated.
- Non-goals: Cross-provider finding normalization, critique correctness as hard gate
- Notes:
  - DR-0104 mandates honest reporting for all 4 browser QA phases
  - Each phase must execute actual analysis, not return stub/placeholder results
  - Empty findings are permitted only when truly nothing is found (honest empty with "status": "clean" metadata)
  - All "foundation-only" and "not implemented in this slice" comments must be removed from phase runner source
  - `runBrowserQa()` must wire actual phase runners for smoke, visual, interaction, and accessibility
