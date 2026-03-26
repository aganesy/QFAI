# R11 — Devil's Advocate (Cycle 2)

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325122000000 (Cycle 2)

## Cycle 1 Fix Verification

- [x] `99_delta.md` Rejected Visual Directions section: present, substantive, both Options B and C documented with recurrence prevention
- [x] `99_delta.md` Design Anti-Goals Locked section: present, 8 anti-goals, each with validator enforcement code and locked date
- [x] `04_Sources.md` Competitive Reference Registry: present, 3 entries (SRC-0008/0009/0010), all mandatory fields populated
- [x] Delta entries for both fixes logged with correct attribution (R08/R11 for sources, R09/R11 for delta sections)

## Checklist

- [x] Rejected Visual Directions entries include genuine recurrence prevention (not just "don't do this again")
- [x] Design Anti-Goals Locked section has governance mechanism — anti-goals require formal OQ + delta entry to weaken
- [x] Competitive registry entries have differentiated rejection rationale — not identical boilerplate across entries
- [x] The anti-goal "No dual primary CTA" in 99_delta.md is backed by the actual CTA Hierarchy table fix in 03_Story-Workshop.md
- [x] No tension between the Competitive Reference Registry in 04_Sources.md and the competitive_refs block in the 03_Story-Workshop.md DDS YAML
- [x] Recurrence prevention for Option B (Command-First Terminal) requires concrete evidence before reconsideration — not a blanket ban
- [x] Recurrence prevention for Option C (Scorecard Dashboard) requires evidence of quantitative data availability — addresses the root cause

## Findings

1. **The Rejected Visual Directions section holds up under scrutiny.** Both entries have substantive, non-interchangeable rejection reasons. Option B's rejection is grounded in brand conflict and poor mobile viability — not just aesthetic preference. Option C's rejection directly references the "no card mosaic default" anti-goal, making it structurally linked to an enforced validator. This is first-class delta content, not boilerplate.

2. **Design Anti-Goals Locked governance is adequate but has a gap worth noting.** The locked anti-goals reference validators QFAI-DDP-009 and QFAI-DDP-014 for pre-existing checks, and QFAI-DDP-019..021 for new ones. However, the "No dual primary CTA" anti-goal references QFAI-DDP-014, which is an existing anti-pattern check. The assumption is that QFAI-DDP-014 already covers `dual-primary-cta` as a named pattern. This is consistent with the 03_Story-Workshop.md Design Anti-Goals table, which says `QFAI-DDP-014 anti-pattern: dual-primary-cta`. The enforcement chain is intact. Observation only — not blocking.

3. **The 04_Sources.md competitive registry and the 03_Story-Workshop.md DDS YAML competitive_refs block are complementary, not duplicative.** The DDS YAML block (adopted/rejected structure) captures the design-decision narrative; the Sources registry (SRC-0008..0010) captures traceability and mandatory-field validation. The split is intentional and documented in the Traceability Rules note. The dual-location approach is justified by different purposes.

4. **One observation on registry field naming consistency.** The Sources registry column header uses `adopted_points` / `rejected_points` / `local_translation`, while the DDS YAML uses `adopted` / `rejected` / `local_translation_policy`. The field names are not identical. This is a documentation inconsistency that could confuse a contributor implementing QFAI-DDP-021. Concrete alternative: either align the column headers to match the YAML keys exactly, or add a note in the Field Definitions subsection explicitly mapping the column names to their YAML counterparts. This is an observation, not a blocker for this discussion phase — the conceptual intent is unambiguous.

5. **Recurrence prevention for both rejected options requires positive evidence before re-proposal** — a good epistemic standard. Option B requires a mobile wireframe proof and CTA conflict analysis. Option C requires evidence of quantitative data availability and an explicit anti-goal waiver with rationale. These are concrete, actionable gates.

6. **The "No option-free anchor" and "No anchor-less pack" anti-goals are now both locked in 99_delta.md and enforced by QFAI-DDP-020 and QFAI-DDP-021 respectively.** The chain from anti-goal to validator to acceptance criteria in 03_Story-Workshop.md user stories is complete.

7. No blocking issues found. The one field-naming inconsistency (finding 4) is logged as an observation for the implementation phase but does not impede review passage.

## Verdict

**PASS** (with observation: field naming inconsistency between Sources registry column headers and DDS YAML keys — recommend alignment at implementation time)
