# R07 — Frontend Reviewer

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] HTML+CSS screen mock requirement is acknowledged; QFAI-VIS-002 check is present in the validation flow
- [x] DDS section in `03_Story-Workshop.md` covers the three layout options (A, B, C) with a structured comparison table
- [x] Selected anchor screen (Option A — Editorial Split) is explicitly named with rationale and breakpoint coverage
- [x] CTA hierarchy defines primary, secondary, and tertiary levels with placement and visual treatment per level
- [x] State coverage matrix addresses empty, loading, error, and success/populated states for all four key screens
- [x] Design anti-goals are explicit and mapped to validator codes (no vague prohibitions)
- [x] Breakpoints are defined: desktop ≥1280px, tablet 768–1279px, mobile <768px
- [x] Mobile reflow strategy described for anchor screen (editorial split to stacked single-column at tablet; accordion at mobile)
- [x] CTA swap rule (Generate / Run Validation as the only permitted primary CTA transition) is documented
- [x] Competitive references include adopted UI patterns (Linear, Vercel, Stripe) with explicit local translations
- [ ] The CTA table defines two "Primary" level rows (Generate Discussion Pack and Run Validation contextual); the single-primary-CTA rule is stated as "No screen may have more than one primary-level CTA simultaneously" — but no acceptance criterion tests the validator's ability to detect when both primaries appear on screen simultaneously rather than via a swap; the behavioral contract is documented but the validation surface for this rule is not explicitly wired to a validator code
- [ ] State coverage for the DDP Summary Editor screen includes a partial state ("required fields present but values are generic — QFAI-DDP-009 anti-goal warning"), which references DDP-009 as a warning; this is inconsistent with the error-severity policy for structural checks in v1.7.0 — the distinction between a structural-absence error and a quality-content warning should be made explicit in the state coverage table notes
- [ ] The HTML+CSS screen mock itself (the actual markup) is not present in the reviewed portion of the discussion pack; the check QFAI-VIS-002 is a warning (not an error), but the discussion pack is authored as if it is UI-bearing, and the authoring experience for the mock is not covered by any story or acceptance criterion

## Findings

1. **[Medium] Dual-primary CTA runtime detection gap**: The DDS specifies a swap between "Generate Discussion Pack" and "Run Validation" as the only permitted primary CTA transition. This rule is documented at the template level but no validator code (DDP-014 anti-pattern: `dual-primary-cta`) is specified to detect the simultaneous presence of both primaries in the HTML mock. The detection logic would need to parse rendered HTML context (e.g., both elements visible in the DOM), which is outside the current text-based validator capability. The rule is architecturally correct but unenforceable by the v1.7.0 validator suite. Recommended action: annotate the CTA rule as "human-review enforced at review phase; structural enforcement deferred to v1.7.2 render-based validators" to avoid implying automated enforcement that does not exist.

2. **[Low] DDP Summary Editor partial-state DDP-009 warning inconsistency**: The state coverage table for the DDP Summary Editor screen lists a partial state that triggers DDP-009 as a "warning". NFR-0003 and REQ-0009 both state that all structural checks in v1.7.0 emit error severity. DDP-009 is a pre-existing validator; if it is a warning in this context that is intentional (heuristic quality check, not structural), the state coverage table should clarify "heuristic-quality check, non-blocking" rather than leaving it ambiguous alongside error-severity checks in the same table.

3. **[Low] HTML+CSS screen mock not present in discussion pack**: The pack is correctly classified as UI-bearing, and QFAI-VIS-002 is described as a warning for a missing screen mock. However, for a discussion pack that introduces a new mandatory DDS section and describes a specific anchor screen layout, the absence of an HTML+CSS mock means the option comparison and anchor selection decisions cannot be visually verified in this review. This is acceptable given that VIS-002 is a warning, but it means the editorial split layout (Option A) is specified textually only. Downstream SDD and prototyping agents will need to work from the textual description, which is sufficient but not optimal for a pack about strengthening visual design inputs.

4. **[Pass] DDS section design is coherent and complete for authoring experience**: The Design Direction Summary section in `03_Story-Workshop.md` provides a well-structured authoring experience. The DDP Summary YAML block, option comparison table, selected anchor section, CTA hierarchy table, state coverage matrix, and design anti-goals table are distinct sections with clear headings. The flow diagram (Flow 2: Author Decision Tree) accurately maps the authoring steps. Authors working from the DDS template will understand what is required and in what order.

5. **[Pass] Competitive reference registry DDS integration**: The competitive reference registry in the DDS (adopted: Linear, Vercel, Stripe; rejected: Notion, Jira) is correctly integrated with the visual thesis and option comparison. Local translations map directly to specific QFAI interaction or layout decisions. The rejected references (Notion, Jira) correctly appear as the competitive precedents for Option C in the comparison table, with Option C rejected for anti-goal conflicts. The traceability loop is closed.

## Verdict

**PASS**

Finding 1 identifies a documentation gap (implicit enforcement claim vs. actual validator capability) that should be clarified before implementation begins. Finding 2 is a table clarity issue. Finding 3 is noted but is by design given VIS-002's warning-only status. Neither finding constitutes a structural defect in the discussion pack requirements. The DDS authoring experience design is coherent and the frontend-relevant content (CTA hierarchy, state coverage, breakpoints, anti-goals) is sufficiently specified for downstream SDD.
