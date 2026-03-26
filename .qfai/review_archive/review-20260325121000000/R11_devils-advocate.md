# R11 — Devil's Advocate

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] Challenge the UI-bearing detection premise — does keyword/artifact detection actually solve the problem?
- [x] Challenge the assumption that structural validators alone improve downstream UI quality
- [x] Challenge the DDS placement decision (03_Story-Workshop.md vs. dedicated file)
- [x] Challenge the three-option screen comparison as genuinely comparative vs. performative
- [x] Challenge the choice of `error` severity for all new structural checks
- [x] Challenge the scope decision to leave downstream skills unchanged in v1.7.0
- [x] Challenge the competitive reference registry requirements as adequate traceability
- [x] Verify that every FAIL item is accompanied by a concrete alternative proposal
- [x] Verify that 99_delta.md contains a "Rejected Visual Directions" section as required by REQ-0011
- [x] Verify that 04_Sources.md has been upgraded to the competitive reference registry format

## Findings

### Finding 1 — SEVERITY: HIGH — 99_delta.md is missing the mandatory "Rejected Visual Directions" section

REQ-0011 explicitly states that `99_delta.md` must be updated with a `## Rejected Visual Directions` section, recording `direction_summary`, `rejection_reason`, and `recurrence_prevention` per entry. The current `99_delta.md` contains only `## Adopted`, `## Rejected` (which tracks _OQ-level decisions_, not _visual directions_), and `## Drift Events`. There is no `## Rejected Visual Directions` section at all.

The screen options that were evaluated and rejected — Option B (Command-First) and Option C (Scorecard Dashboard) — are documented in `03_Story-Workshop.md` but are not persisted as first-class delta entries in `99_delta.md`. This means the anti-goal data lives only in the Design Direction Summary and will not be consumed by `99_delta.md`-reading agents or future maintainers checking the pack's history.

The discussion pack describes this requirement across `01_Context.md` (Recommended Direction item 4), `05_Scope.md` (item 12), `06_REQ.md` (REQ-0011), and `08_Glossary.md`, yet the file that must satisfy the requirement — `99_delta.md` — does not contain it.

**Verdict contribution: FAIL**

**Concrete alternative**: Add a `## Rejected Visual Directions` section to `99_delta.md` with the following entries, or equivalent:

| Direction Summary                                     | Rejection Reason                                                                                                               | Recurrence Prevention                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Option B — Command-First (full-bleed command palette) | Reduces brand warmth; DDP summary structurally invisible behind palette; validator-readability anti-pattern                    | Any future proposal to use a command-palette-first entry point must explicitly address DDP summary visibility before acceptance    |
| Option C — Scorecard Dashboard (three-column)         | Conflicts with anti-goals (card mosaic, dual-primary-CTA risk); competitive precedents (Notion, Jira) are in the rejected list | Three-column layouts must not be proposed for QFAI pack dashboard views without an explicit anti-goal exception granted in the DDS |

This section satisfies REQ-0011 and its validator (QFAI-DDP-025 per `01_Context.md`, or QFAI-DPACK-DDS-005 per US-D006).

---

### Finding 2 — SEVERITY: MEDIUM — 04_Sources.md is NOT upgraded to the competitive reference registry format

`01_Context.md` (Recommended Direction item 2), `05_Scope.md` (item 13), and `06_REQ.md` (REQ-0005) all specify that `04_Sources.md` must be upgraded from a free-form source log to a structured competitive reference registry with three mandatory fields per entry: `adopted_points`, `rejected_points`, `local_translation`. The current `04_Sources.md` is still a flat source registry table (SRC-0001 through SRC-0007) with `Title`, `Type`, `Location`, `Retrieved`, `Notes` columns. No `## Competitive Reference Registry` section exists. No entry has `adopted_points`, `rejected_points`, or `local_translation` fields.

The competitive reference content IS present in the discussion pack — but it is located in `03_Story-Workshop.md` (the DDS YAML block), not in `04_Sources.md`. This means `04_Sources.md` does not demonstrate the v1.7.0 template enhancement it is intended to specify as a requirement. The validator QFAI-DDP-021 would fire on this pack's own `04_Sources.md`.

**Verdict contribution: FAIL**

**Concrete alternative**: Add a `## Competitive Reference Registry` section to `04_Sources.md` with at minimum the following structured entries, extracting data already present in the `03_Story-Workshop.md` DDS YAML:

```yaml
- ref_id: CR-0001
  source: Linear.app
  adopted_points:
    - Keyboard-first navigation model with command palette
  rejected_points:
    - Full-bleed command-palette-only layout for primary entry point (reduces brand warmth)
  local_translation: >
    Adopt command-palette pattern for pack generation trigger; command palette is a secondary
    affordance, not the primary layout. Deprioritize mouse-only flows.

- ref_id: CR-0002
  source: Vercel Dashboard
  adopted_points:
    - Dark-mode-first design with surgical use of status color (green/red only for meaningful state)
  rejected_points:
    - Dense, always-visible status grids — visual noise without task-relevant signal
  local_translation: >
    Apply status color only to validation pass/fail indicators. No decorative color usage elsewhere.

- ref_id: CR-0003
  source: Stripe Docs
  adopted_points:
    - Progressive disclosure — feature depth revealed inline without page navigation
  rejected_points:
    - Separate settings/config page pattern — adds navigation overhead for power users
  local_translation: >
    Show advanced validator config inline under the relevant story rather than routing to a
    separate settings page.
```

---

### Finding 3 — SEVERITY: MEDIUM — TC-2 (artifact-presence detection) contradicts the REQ-0001 keyword-based description

`09_Constraints.md` TC-2 states: "Keyword scanning of free-text prose is insufficient on its own and may not be the sole signal used for classification." This is the formally binding constraint. However, `06_REQ.md` REQ-0001 describes the detection as scanning for "UI artifact keywords and section markers (screen, ui, interface, mock, layout, design, wireframe, prototype)." The `01_Context.md` background section also states: "UI-bearing detection: presence of keywords `screen|ui|interface|mock|layout|design` in `03_Story-Workshop.md`."

These two views are in tension. TC-2 mandates artifact-presence detection; REQ-0001 and `01_Context.md` describe keyword detection. The `08_Glossary.md` entry for "UI-bearing artifact detection" aligns with TC-2 (artifact presence), but the REQ text does not. If the implementation follows REQ-0001 literally, it violates TC-2.

**Verdict contribution: concern (not standalone FAIL, but must be resolved pre-SDD)**

**Concrete alternative**: Amend REQ-0001 to align with TC-2. Replace the keyword list with: "The validator must detect UI-bearing packs by confirming the presence of UI-related structural artifacts in the pack — specifically: a DDP section or design contract in `03_Story-Workshop.md`, a screen specification or wireframe file reference in any pack document, or a component inventory entry. Keyword heuristics may supplement but must not substitute for artifact-presence checking." This eliminates the implementation ambiguity before the SDD phase compounds it.

---

### Finding 4 — SEVERITY: LOW — Validator code namespace inconsistency: QFAI-DPACK-DDS-001..005 vs. QFAI-DDP-019..025

`01_Context.md` and `02_Inception-Deck.md` introduce new validator codes as QFAI-DDP-019 through QFAI-DDP-025 (extending the existing DDP series). However, `03_Story-Workshop.md` user stories and flow diagrams refer to QFAI-DPACK-DDS-001, QFAI-DPACK-DDS-002, QFAI-DPACK-DDS-003, QFAI-DPACK-DDS-004, QFAI-DPACK-DDS-005 — an entirely different namespace. `06_REQ.md` requirements generally describe the checks without code assignments, leaving the implementer with two inconsistent code series to reconcile. The SDD phase will inherit this ambiguity.

**Concrete alternative**: Pick one namespace in this discussion phase and use it consistently. Given that `01_Context.md` is the SSOT for inputs and `02_Inception-Deck.md` is the authoritative alignment document, adopt QFAI-DDP-019..025. Update `03_Story-Workshop.md` acceptance criteria and Mermaid flows to use these codes uniformly. Add a table to `08_Glossary.md` mapping the DDS check names to their QFAI-DDP codes.

---

### Finding 5 — SEVERITY: OBSERVATION — The three-screen comparison is well-executed but self-validating

The Screen Option Comparison in `03_Story-Workshop.md` genuinely evaluates three distinct options (Editorial Split, Command-First, Scorecard Dashboard) with documented pros, cons, anti-goal conflicts, and mobile viability. This is substantively stronger than prior releases. However, Option C (Scorecard) was constructed to fail — its competitive references are drawn exclusively from the "rejected" list (Notion, Jira), making rejection inevitable rather than examined. A fair option comparison should present each option at its strongest.

This does not constitute a FAIL because the intent of the requirement (no single untested direction) is met. But the SDD-phase reviewer should note that "three options" does not automatically mean three genuinely-competing options.

**No alternative required (PASS contribution).**

---

### Finding 6 — SEVERITY: OBSERVATION — The assumption that structural validators alone prevent generic UI generation is optimistic

The core premise of v1.7.0 is that adding mandatory structural fields produces better downstream UI. But `02_Inception-Deck.md` Q7 Risk 1 acknowledges: "Authors fill new mandatory fields with low-quality placeholder text." The mitigation cited is "banned-pattern checks catch generic filler text." However, no banned-pattern check for DDS fields is defined in the requirements. The anti-pattern detection (QFAI-DDP-014) targets layout patterns (card mosaic, dual-primary-CTA), not filler text in DDS sub-fields.

This is coherent for v1.7.0's stated structural-only scope, but it means the problem is only half-solved at this release. The pack correctly defers heuristic/aesthetic checks to v1.7.2. The observation stands: v1.7.0 is a necessary but not sufficient condition for preventing generic UI.

**No alternative required (design decision is correct for scoped release).**

## Verdict

**FAIL**

The discussion pack is architecturally coherent and the requirements are well-constructed. However, two concrete gaps prevent a PASS:

1. **`99_delta.md` is missing the mandatory `## Rejected Visual Directions` section** defined by REQ-0011. This is not a template question — it is a content obligation on the current pack, and the data to populate it exists in `03_Story-Workshop.md`. The section must be added to `99_delta.md` before this pack can be declared complete.

2. **`04_Sources.md` has not been upgraded to the competitive reference registry format** defined by REQ-0005 and `05_Scope.md` item 13. The competitive reference content exists but lives in the wrong file. The `04_Sources.md` template enhancement must be reflected in this pack's own `04_Sources.md`.

Both fixes are additive and low-effort. Concrete alternatives are provided above in Findings 1 and 2. Correct both issues and re-submit for review.
