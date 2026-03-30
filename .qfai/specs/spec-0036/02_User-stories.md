# 02 User Stories

## US Catalog

- US-0036-0001: Render Evidence Wiring (D-10)
- US-0036-0002: Browser QA MVP (D-11)

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
