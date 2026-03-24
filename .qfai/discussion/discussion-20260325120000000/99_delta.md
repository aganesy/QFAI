# 99_delta

## Adopted

| Date       | Change Type | Affected                | Summary                                                                                       | Reason                                                                                    |
| ---------- | ----------- | ----------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 2026-03-25 | Add         | 03_Story-Workshop       | Design Direction Summary section placed in 03_Story-Workshop.md per SSOT principle            | Avoids drift that arises from maintaining design direction in dual locations               |
| 2026-03-25 | Add         | 04_Sources              | Competitive reference registry enhanced with 3 mandatory fields (adopted/rejected/translation) | Provides traceability for UI design decisions without excessive onboarding friction        |
| 2026-03-25 | Add         | Validators              | New structural checks carry error severity (not warning)                                       | Binary structural checks (present/absent) do not benefit from an intermediate warning phase |
| 2026-03-25 | Add         | Scope                   | UI-bearing packs only targeted by new v1.7.0 hardening requirements                           | Minimizes onboarding friction for non-UI packs; preserves backward compatibility           |
| 2026-03-25 | correction  | 03_Story-Workshop       | CTA hierarchy dual-primary merged into single row with contextual swap rule                    | R13 review finding: two Primary rows contradicted single-primary-CTA rule                 |
| 2026-03-25 | correction  | 03_Story-Workshop       | State label standardized to "Populated" (removed "Success / Populated" variant)                | R13 review finding: REQ-0007 mandates canonical "populated" term                          |
| 2026-03-25 | correction  | All files                | Validator code series unified to QFAI-DDP-019..025 (removed QFAI-DPACK-DDS-001..005)          | R09 review finding: two incompatible naming series caused traceability confusion           |
| 2026-03-25 | Add         | 04_Sources              | Competitive Reference Registry section added with 3 entries and field definitions              | R08/R11 review findings: REQ-0005 targets 04_Sources.md but registry content was missing  |
| 2026-03-25 | Add         | 99_delta                | Rejected Visual Directions and Design Anti-Goals Locked sections added                         | R09/R11 review findings: rejected screen options not persisted as first-class delta entries |
| 2026-03-25 | Add         | 14_Review-Request       | Design Direction Decisions section added with anchor, rejections, adopted refs, anti-goals      | R09 review finding: review request lacked design-direction decision capture                |
| 2026-03-25 | Add         | 10_Policy               | Rollback strategy, pre-publish validation gate, and single-PR contingency added                | R10 review finding: no rollback/contingency strategy for post-publish or blocking defects |

## Rejected

| Date       | OQ-ID   | Option                                                      | Reason                                                                                           | Recurrence Prevention                                                                     |
| ---------- | ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 2026-03-25 | OQ-0002 | Place Design Direction Summary in 02_Inception-Deck.md      | 02 is for alignment and convergence, not concrete design details; mixing concerns violates SSOT  | All concrete design decisions belong in 03_Story-Workshop.md; 02 is read-only for DDS     |
| 2026-03-25 | OQ-0003 | Require source_url and relevance_score as mandatory fields   | Increases onboarding friction without proportional traceability benefit at the discussion gate   | Mandatory fields must be minimal judgment traces; metrics belong in a dedicated audit step |
| 2026-03-25 | OQ-0004 | Gradual warning-first approach for new structural validators | Structural presence is binary; a warning phase delays adoption of a necessary quality gate       | Reserve warning severity for heuristic and aesthetic checks only, not structural presence  |

## Rejected Visual Directions

Design options considered and rejected during the Design Direction Summary process. Each rejection includes rationale and recurrence prevention to avoid revisiting settled decisions.

| Date       | Option Name | Screen/Component | Reason for Rejection | Recurrence Prevention |
| ---------- | ----------- | ---------------- | -------------------- | --------------------- |
| 2026-03-25 | Option B — Command-First Terminal | Primary layout | Floating action button pattern conflicts with QFAI's editorial content-first approach; mobile viability is poor due to persistent overlay; conflicts with "no vague hero copy" anti-goal when hero space is consumed by command prompt | If terminal-first layout is proposed again, require mobile wireframe proof and CTA conflict analysis before consideration |
| 2026-03-25 | Option C — Scorecard Dashboard | Primary layout | Card mosaic layout directly violates "no card mosaic default" anti-goal; sidebar persistent button placement has weak mobile translation; scorecard metaphor implies quantitative completeness that discussion packs do not yet support | If scorecard layout is proposed, require evidence of quantitative data availability and explicit anti-goal waiver with rationale |

## Design Anti-Goals Locked

The following design anti-goals were established during v1.7.0 discussion and must not be weakened without a formal OQ + delta entry.

| Anti-Goal | Locked Date | Validator Enforcement |
| --------- | ----------- | --------------------- |
| No card mosaic default | 2026-03-25 | QFAI-DDP-014 |
| No rainbow accents | 2026-03-25 | QFAI-DDP-014 |
| No vague hero copy | 2026-03-25 | QFAI-DDP-009 |
| No decorative visualization | 2026-03-25 | QFAI-DDP-014 |
| No dual primary CTA | 2026-03-25 | QFAI-DDP-014 |
| No missing DDS section | 2026-03-25 | QFAI-DDP-019 |
| No option-free anchor | 2026-03-25 | QFAI-DDP-020 |
| No anchor-less pack | 2026-03-25 | QFAI-DDP-021 |

## Drift Events

None — no unintended drift occurred during this discussion phase.

## Work Orders Summary

| Step | Role (sub-agent) | Task title  | Input (refs)                          | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ----------- | ------------------------------------- | ------------- | -------------------- |
| 1    | orchestrator     | Delta build | OQ register, resolution log, rejected options | `99_delta.md` | PASS                 |
