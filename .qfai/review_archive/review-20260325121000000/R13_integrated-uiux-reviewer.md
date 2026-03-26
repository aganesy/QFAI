# R13 — Integrated UI/UX Reviewer

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] Verify cross-specialist consistency: DDS YAML design direction vs. Screen Option Comparison table vs. Selected Anchor rationale
- [x] Evaluate CTA hierarchy definition — completeness, single-primary rule, cross-screen consistency
- [x] Evaluate state coverage matrix — completeness, all four mandatory states present per key screen
- [x] Evaluate Design Anti-Goals — specificity, validator enforcement mapping, cross-document consistency
- [x] Evaluate competitive reference alignment with visual thesis
- [x] Confirm Design Token usage is coherent and non-contradictory in the DDS
- [x] Evaluate the DDS section's own UX — is the authoring experience well-specified for practitioners?
- [x] Evaluate how the new authoring requirements change the UX of creating discussion packs
- [x] Confirm Mermaid flow diagrams (Flow 1, Flow 2) are consistent with DDS design decisions
- [x] Evaluate screen mock coverage and HTML+CSS mock alignment with DDS direction
- [x] Confirm N/A is not applicable — v1.7.0 IS a UI/UX authoring change

## Findings

### Finding 1 — SEVERITY: HIGH — DDS YAML uses "success" as a state label; REQ-0007 mandates "populated" — cross-document terminology inconsistency

`06_REQ.md` REQ-0007 states: "The four states `empty`, `loading`, `error`, and `populated` must all be present." However, the DDS YAML block in `03_Story-Workshop.md` uses the label `success` (under `interaction_thesis`, `cta_hierarchy`, and `competitive_refs` adopted section). More critically, the State Coverage table in `03_Story-Workshop.md` uses the column header "Success / Populated" — a hybrid label that cannot be matched by a simple string check against the required state label "populated."

If the state coverage validator (QFAI-DDP-024 per `01_Context.md`, or the DDP-013 extended check per `03_Story-Workshop.md` flows) performs a string match for "populated", the table's "Success / Populated" column header would either pass or fail depending on substring vs. exact match implementation. This ambiguity must be resolved before the SDD phase defines the validator logic.

Additionally, `02_Inception-Deck.md` Q3 Package Design describes the state list as "empty, loading, error, success, partial" — yet another variant. There are at least three different state vocabulary sets across the pack: `empty/loading/error/success` (02), `empty/loading/error/populated` (06_REQ), and `empty/loading/error/success/populated/partial` (03 table). The validator cannot satisfy all three simultaneously.

**Concrete fix**: Choose one canonical state vocabulary and apply it uniformly. The REQ-0007 definition is the authority. Align all occurrences:

- `02_Inception-Deck.md` Q3: change "success" to "populated"
- `03_Story-Workshop.md` State Coverage table: rename "Success / Populated" column to "Populated"
- `03_Story-Workshop.md` DDS YAML `interaction_thesis`: replace "color confirm" language referencing success with "populated-state confirmation"
- `06_REQ.md` REQ-0007: add a clarifying note that "success" is a deprecated alias for "populated" and must not appear in state coverage matrices

---

### Finding 2 — SEVERITY: MEDIUM — CTA hierarchy has two "Primary" entries — violates the single-primary-CTA rule it defines

The CTA hierarchy table in `03_Story-Workshop.md` defines:

- Primary: "Generate Discussion Pack"
- Primary (contextual): "Run Validation"

The table itself contains the rule "No screen may have more than one primary-level CTA visible simultaneously" and calls this swap the "only permitted primary CTA transition." However, representing both as "Primary" in the hierarchy table means any validator that checks for "at most one primary CTA" would find two primary rows and fire an error — even on a conformant pack.

The intent is correct (context-switching primary CTAs are legitimate and widely used in modern UIs), but the representation is self-contradictory. A CTA hierarchy table that lists two primary-level CTAs violates the visual grammar it is documenting, regardless of the inline explanation.

This also creates a downstream authoring confusion: when SKILL.md is updated to describe the DDS section format, authors will use this pack as a reference and may replicate the dual-primary pattern assuming it is a valid template.

**Concrete fix**: Restructure the CTA hierarchy to use a single primary slot with a state-dependent label:

| Level     | Label (default state)    | Label (active pack state) | Trigger                         | Placement             | Visual treatment                       |
| --------- | ------------------------ | ------------------------- | ------------------------------- | --------------------- | -------------------------------------- |
| Primary   | Generate Discussion Pack | Run Validation            | Toggled by active pack presence | Nav top-right + hero  | Amber filled → Green filled transition |
| Secondary | View Validation Report   | Edit Pack                 | Context-dependent               | Inline / Detail panel | Outlined pill                          |
| Tertiary  | Open Documentation       | Export Pack               | Always available / overflow     | Footer / Kebab menu   | Plain link / Icon-only                 |

This preserves the intent (context-switch primary) while resolving the dual-primary-row representation issue and making the pattern validator-safe.

---

### Finding 3 — SEVERITY: MEDIUM — HTML+CSS screen mock is absent from the discussion pack

`03_Story-Workshop.md` defines `SCREEN-ANCHOR-001` as the selected anchor screen (Option A — Editorial Split), specifies the 60/40 layout, breakpoints (desktop ≥1280px, tablet 768–1279px, mobile <768px), reflow strategy (collapses to stacked single-column at tablet), and the full color palette (amber `#f59e0b`, green `#10b981`, border `rgba(255,255,255,.28)`). This is sufficient design specification to generate an HTML+CSS mock.

However, no actual HTML+CSS mock section is present anywhere in the pack. `02_Inception-Deck.md` Q5 notes that `discussionVisuals.ts` (QFAI-VIS-001..002) validates HTML mock presence for UI-bearing packs. The Mermaid Flow 1 in `03_Story-Workshop.md` shows: "HTML+CSS mock present in UI-bearing pack? MISSING → WARNING: QFAI-VIS-002 Screen mock absent."

Under v1.6.5 rules, the mock absence produces a WARNING (QFAI-VIS-002). Under v1.7.0 scope, this validator is "unmodified" per `02_Inception-Deck.md` Q5. So the warning-level absence of a mock in this pack is technically within scope. However, this is a discussion pack for a release that introduces authoring requirements for UI-bearing packs — and the reference pack demonstrating those requirements has no screen mock. This undermines the example quality for downstream authors and reviewers using this pack as a template reference.

**Concrete fix**: Add a minimal HTML+CSS mock for SCREEN-ANCHOR-001 (Editorial Split layout) to `03_Story-Workshop.md` that demonstrates the 60/40 split, amber primary CTA, dark steel-blue surface, and at minimum the "empty" and "populated" states of the Pack List screen. This is not a v1.7.0 validator requirement, but it makes this discussion pack a complete reference artifact for the authoring requirements it defines.

---

### Finding 4 — SEVERITY: LOW — Mermaid Flow 2 (Author Decision Tree) specifies "4+ anti-goals" as a requirement; REQ-0008 only requires "at least one"

`03_Story-Workshop.md` Flow 2 (Author Decision Tree) node S12 states: "Define Design Anti-Goals — Explicit prohibitions — Each mapped to a validator — At least 4 anti-goals." `06_REQ.md` REQ-0008 states: "The DDS `anti_goals` field must contain at least one explicit design anti-goal." The DDS YAML block in `03_Story-Workshop.md` lists four anti-goals; the Design Anti-Goals table lists eight.

The discrepancy is between the REQ floor (1) and the authoring guidance floor (4). If a validator enforces REQ-0008 (at least 1), the Flow 2 guidance suggests authors should write 4+. This is not an error — the guidance is stricter than the minimum — but it creates confusion about whether 1, 3, or 4 anti-goals are required for validator passage. Authors reading the flow diagram will expect to need 4; the validator will pass on 1.

**Concrete fix**: Align either the REQ or the flow diagram. If 1 is the validated minimum, update Flow 2 node S12 to say "At least 1 anti-goal (4+ recommended)." If 4 is the actual intended minimum, update REQ-0008 to require at least 4. Given the pack's own anti-goals table has 8 entries, raising the requirement to 3 is defensible and creates a more useful enforcement threshold.

---

### Finding 5 — SEVERITY: LOW — Competitive reference local_translation_policy in DDS YAML is a prose field; it is not the same as the per-entry `local_translation` field required by REQ-0005

The DDS YAML in `03_Story-Workshop.md` has a top-level `local_translation_policy` field (a prose paragraph describing the general extraction principle). US-D004's acceptance criteria reference `local_translation_policy` as one of the validator-checked fields (US-D004 AC: "A competitive_refs block without a local_translation_policy prose field triggers QFAI-DDP-018 as a warning"). REQ-0005 requires per-entry `local_translation` fields (not a top-level policy field).

These are different things: a pack could satisfy the per-entry `local_translation` requirement (REQ-0005, error-severity) while also having or not having the top-level `local_translation_policy` prose (US-D004 AC, warning-severity). This distinction is clear in the YAML block (per-entry translation is under each adopted entry; the policy is a top-level field), but it is not clear in the validator code description or the REQ text.

**Concrete fix**: Add a clarifying note to REQ-0005 and US-D004 distinguishing the two fields: (1) per-entry `local_translation` under each adopted competitive reference — required, error severity; (2) top-level `local_translation_policy` prose — recommended, warning severity. This prevents the SDD-phase validator spec from conflating the two.

---

### Finding 6 — SEVERITY: OBSERVATION — DDS authoring UX is well-designed; the DDS itself succeeds as a self-demonstrating reference

The Design Direction Summary section in `03_Story-Workshop.md` uses the v1.7.0 pack as its own reference implementation: the DDS documents the authoring requirements that the pack introduces. The YAML block is complete and internally consistent (adopted/rejected competitive refs cross-check with the Screen Option Comparison table; the rejected options in the comparison table reference the same Notion/Jira sources listed as rejected competitive refs). The CTA hierarchy table is comprehensive (six rows across three levels with visual treatment specifications). The State Coverage table covers all four key screens with all five state columns.

This self-demonstrating approach is the right UX choice for a specification document — it is both the spec and its own example. The non-linear relationship between the DDS YAML block (compact, machine-readable) and the detailed sections (Screen Option Comparison, CTA Hierarchy, State Coverage, Design Anti-Goals) is coherent: the YAML block is the upstream anchor, the sections are the downstream elaboration.

The authoring flow (Flow 2) correctly captures the DDS authoring sequence and will be useful as a practitioner guide. The Mermaid fidelity is high — node labels accurately reflect the validator behavior described in the requirements.

No action required.

---

### Finding 7 — SEVERITY: OBSERVATION — Color token specifications are present but not in a design token format

The CTA hierarchy table specifies exact color values (amber `#f59e0b`, green `#10b981`, border `rgba(255,255,255,.28)`). These are useful and specific, but they are raw hex/rgba values rather than design token references (e.g., `--color-cta-primary`, `--color-state-success`). The `discussionVisuals.ts` validator (QFAI-VIS-001..002) includes design token presence checks. A downstream HTML+CSS mock that uses raw hex values rather than token variables would not fail the design token validator, but it would not contribute to the design token registry either.

This is an observation for the prototyping-phase handoff, not a v1.7.0 blocker. The discussion phase is not expected to define the token registry. However, the DDS should note that raw color values in the CTA hierarchy table are implementation placeholders, not final token values, to prevent the SDD or prototyping phase from treating them as authoritative token names.

No action required; consider adding a footnote.

## Verdict

**FAIL**

The DDS section is substantively well-constructed and the authoring requirements are internally coherent. However, two issues prevent a clean PASS:

1. **State label terminology is inconsistent across the pack** (Finding 1). REQ-0007 mandates "populated," but the pack uses "success" and "Success / Populated" in two documents. The validator cannot consistently enforce the canonical state label without a terminology alignment fix. Concrete fix provided above.

2. **CTA hierarchy table lists two "Primary" rows**, contradicting the single-primary-CTA rule defined in the same table (Finding 2). This creates a validator-unsafe representation and a misleading authoring reference. Concrete restructuring provided above.

Finding 3 (no HTML+CSS mock) is notable but not a blocker at discussion phase since QFAI-VIS-002 is warning-severity and v1.7.0 does not change the mock requirement. Findings 4 and 5 are low-severity clarification items that should be addressed before SDD. Findings 6 and 7 are observations with no required action.

Fix Findings 1 and 2, then re-submit for review.
