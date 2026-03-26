# R09 — Design Review Lead

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] All 14 REQs (REQ-0001 through REQ-0014) have a Source column referencing at least one SRC-ID
- [x] All 5 NFRs (NFR-0001 through NFR-0005) have a Source column referencing at least one SRC-ID
- [x] `04_Sources.md` traceability table maps each SRC-ID to the REQs and NFRs it drives
- [x] All OQs are traceable: created, resolved/deferred, and logged in both `11_OQ-Register.md` and `12_OQ-Resolution-Log.md`
- [x] Decision flow is coherent: OQ options → resolution → REQ/NFR → validator codes → acceptance criteria
- [x] Validator code namespace is consistent: QFAI-DDP-019..025 series referenced in `01_Context.md`; QFAI-DPACK-DDS-001..005 series used in story acceptance criteria and flows
- [x] `99_delta.md` records all three adopted decisions and all three rejected options with OQ-IDs and recurrence-prevention rules
- [x] `09_Constraints.md` technical constraints (TC-1 through TC-5) are internally consistent with REQs and NFRs
- [x] Scope boundary is consistent across `05_Scope.md` (in/out list), `02_Inception-Deck.md` (NOT list), and the main validator flow
- [x] Discussion pack structure follows the 15-file SSOT format; all required files are present
- [x] Design Direction Summary section in `03_Story-Workshop.md` is properly structured with required subsections
- [ ] Validator code series are inconsistent across files: `01_Context.md` names QFAI-DDP-019..025; US-D001 through US-D008 acceptance criteria use QFAI-DPACK-DDS-001..005 for the new checks; the Mermaid flow uses a mix; this dual naming is never reconciled in any document
- [ ] REQ-0006 states CTA hierarchy `secondary` and `tertiary` are "recommended but not enforced" and only `primary` absence emits error; but the DDS section documents primary, secondary, and tertiary in the CTA table, and QFAI-DDP-023 (from `01_Context.md`) is described as enforcing "CTA hierarchy depth" — this creates a contradiction between REQ-0006 (only primary enforced) and the validator code description (depth implies secondary/tertiary enforcement)
- [ ] `14_Review-Request.md` does not contain the `## Design Direction Decisions` section that US-D005 requires for UI-bearing packs; the template update is a v1.7.0 deliverable but the current file does not demonstrate the new section format

## Findings

1. **[High] Dual validator code series not reconciled**: Two distinct naming schemes are used for the new v1.7.0 validators without explanation:
   - `01_Context.md` and `02_Inception-Deck.md` use: QFAI-DDP-019 (option comparison), QFAI-DDP-020 (anchor screen), QFAI-DDP-021 (competitive ref fields), QFAI-DDP-022 (DDS summary), QFAI-DDP-023 (CTA depth), QFAI-DDP-024 (state coverage), QFAI-DDP-025 (anti-goals in 99_delta)
   - `03_Story-Workshop.md` acceptance criteria and flows use: QFAI-DPACK-DDS-001 (DDS section), QFAI-DPACK-DDS-002 (option comparison), QFAI-DPACK-DDS-003 (anchor screen), QFAI-DPACK-DDS-004 (review request design section), QFAI-DPACK-DDS-005 (delta design section)

   These are different codes for the same validators. The implementation author will not know which series to use. If both series are implemented as separate validators they will double-fire on the same conditions. This is a critical information architecture defect. Recommended fix: designate one series as canonical, retire the other in an errata note, and update all files that reference the retired series.

2. **[Medium] REQ-0006 and QFAI-DDP-023 conflict on CTA depth enforcement**: REQ-0006 explicitly states "Defining secondary and tertiary is recommended but not enforced. Absence of primary emits error severity." QFAI-DDP-023 is described as validating "CTA hierarchy depth" (implying secondary/tertiary presence), and the Inception Deck Q3 states "CTA hierarchy must enumerate primary, secondary, and tertiary levels; QFAI-DDP-023 validates depth." These are contradictory. Either secondary/tertiary are enforced (align REQ-0006 with DDP-023 description) or they are not (remove depth from DDP-023 scope). The current state will produce inconsistent validator behavior depending on which document the implementation author follows.

3. **[Medium] `14_Review-Request.md` missing Design Direction Decisions section**: US-D005 specifies that `14_Review-Request.md` for UI-bearing packs must contain `## Design Direction Decisions` with anchor screen ID, anchor rationale summary, list of rejected options, and adopted competitive references. The current `14_Review-Request.md` file does not contain this section — only `## v1.7.0 Specific Items` review guidance. Since this is a v1.7.0 template deliverable, the template must demonstrate the new section format. This is an authoring incompleteness in the discussion pack itself (the pack is UI-bearing and the current `14_Review-Request.md` is the live example of the new template).

4. **[Low] `99_delta.md` missing Design Direction section for UI-bearing pack**: US-D006 acceptance criteria require that `99_delta.md` for a UI-bearing pack contains a `## Design Direction` section with rejected option entries and anti-goals. The current `99_delta.md` has `## Rejected` (OQ-level rejections) and `## Adopted` (scope decisions) but no `## Design Direction` section with the screen option rejections (Options B and C were rejected in the anchor selection). The delta captures OQ option rejections but not visual direction rejections as specified by US-D006. Since QFAI-DPACK-DDS-005 would fire a warning on this pack as authored, the pack should self-conform to its own requirements.

5. **[Pass] OQ decision flow is coherent and complete**: Each OQ has a clear chain from problem statement to options to recommendation to REQ/NFR impact. OQ-0001 through OQ-0005 resolutions are all traceable to specific REQ entries (OQ-0001 → REQ-0001, OQ-0004 → REQ-0009, etc.). The resolution log timestamps match the discussion date. Evidence fields reference verifiable sources (user input session, architecture review).

6. **[Pass] Scope boundary consistency**: The NOT list in `02_Inception-Deck.md` and the Out of Scope section in `05_Scope.md` are consistent across all items: no browser automation, no aesthetic detection, no migration tooling, no downstream skill changes, no new CLI commands, no Figma dependency, no qualityProfile gating. No item appears in scope in one file and out of scope in another.

## Verdict

**FAIL**

Finding 1 (dual validator code series) is a critical information architecture defect that will cause implementation ambiguity and potentially double-firing validators. It must be resolved before SDD. Finding 2 (REQ-0006 vs QFAI-DDP-023 conflict) is a requirements contradiction that will cause inconsistent implementation. Findings 3 and 4 reveal that the discussion pack does not self-conform to two of its own new requirements (US-D005: missing Design Direction Decisions section in 14_Review-Request.md; US-D006: missing Design Direction section in 99_delta.md), which undermines the pack's authority as a reference example.

**Required fixes**:

1. Choose one validator code series (recommend QFAI-DPACK-DDS-001..005 for discussion-layer checks, QFAI-DDP-019..025 for DDP-layer checks if they are genuinely distinct; otherwise unify) and update all cross-references.
2. Align REQ-0006 with the actual enforcement scope of QFAI-DDP-023: either enforce depth (update REQ-0006) or remove depth from DDP-023 (update `01_Context.md` and `02_Inception-Deck.md`).
3. Add `## Design Direction Decisions` section to `14_Review-Request.md` with the required fields for this UI-bearing pack.
4. Add `## Design Direction` section to `99_delta.md` with rejected options (B and C) as delta entries.
