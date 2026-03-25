# 01_Context

## Metadata

| Key           | Value                          |
| ------------- | ------------------------------ |
| Discussion ID | discussion-20260325120000000   |
| Date          | 2026-03-25                     |
| Owner         | agent                          |
| Source        | qfai_v1.7x_roadmap_overview.md |

## Goal and Completion Criteria

- **Goal**: Define the complete requirements for QFAI v1.7.0 "Discussion Design Hardening" — a targeted release that prevents UI-bearing discussion packs from proceeding downstream with generic, under-specified design inputs by introducing mandatory structural fields, a strengthened competitive reference registry, and new error-severity validators that gate the `/qfai-discussion` exit.
- **Measurable completion criteria**:
  - `03_Story-Workshop.md` template updated with a mandatory "Design Direction Summary" section (option comparison table, selected anchor screen, CTA hierarchy, state coverage matrix) for UI-bearing packs
  - `04_Sources.md` converted into a competitive reference registry with three mandatory fields per entry: `adopted_points`, `rejected_points`, `local_translation`
  - `14_Review-Request.md` updated to capture design-direction decision rationale in structured form
  - `99_delta.md` updated to capture rejected visual directions and design anti-goals in a dedicated section
  - `qfai-discussion/SKILL.md` updated with explicit UI-bearing authoring requirements and completion contract clauses
  - New validators implemented for: option comparison presence, anchor screen presence, competitive reference field completeness, DDP summary presence in 03, CTA hierarchy depth, state coverage matrix, design anti-goals registry — all at `error` severity for UI-bearing packs
  - All new structural checks fire as `error` (not `warning`) immediately upon detection
  - `11_OQ-Register.md` `Disposition: open` count is zero
  - Review roster returns `PASS`

## Stakeholders

- **Primary stakeholders**:
  - QFAI package maintainers (responsible for validator implementation, SKILL.md, template authoring)
  - QFAI users creating UI-bearing discussion packs (directly impacted by new mandatory fields)
- **Secondary stakeholders**:
  - Downstream skill authors (`/qfai-sdd`, `/qfai-prototyping`, `/qfai-implement`, `/qfai-atdd`) — consume enriched design context
  - Validator maintainers — implement and maintain new check codes
  - Review agents — execute review roster against new structural requirements
  - CI/CD pipeline — enforces new error-severity gates on PR merges

## Background

### Business Context

QFAI v1.6.5 established the Design Direction Pack (DDP) as a mandatory upstream artifact and introduced a validation suite (QFAI-DDP-001..018, QFAI-DPACK-001..008, QFAI-VIS-001..002, QFAI-DPACK-009..010) to prevent UI-bearing work from proceeding without a DDP. However, post-release analysis of generated discussion packs revealed that the _content quality_ of design inputs remains low even when validators pass: option comparison is skipped, anchor screens are not selected, competitive references lack structured adoption/rejection rationale, and design anti-goals are not captured in a retrievable format.

The net effect: validators approve a pack as structurally complete, but the downstream agents (`/qfai-sdd`, `/qfai-prototyping`) receive insufficient design direction and produce generic UIs. The problem is not missing validation — it is that the discussion templates do not _force_ the high-quality design thinking that makes later validators meaningful.

### Technical Context

- Current validator suite: `ddpValidation.ts` (DDP-001..018), `discussionPack.ts` (DPACK-001..008), `discussionVisuals.ts` (VIS-001..002), `discussMermaid.ts` (DPACK-009..010)
- UI-bearing detection: presence of keywords `screen|ui|interface|mock|layout|design` in `03_Story-Workshop.md`
- The `03_Story-Workshop.md` template contains user stories, example seeds, a Mermaid user flow diagram, and an HTML+CSS mock — but no structured design direction summary
- `04_Sources.md` currently serves as a free-form source traceability log with `SRC-XXXX` identifiers; it has no competitive reference structure
- `14_Review-Request.md` captures reviewer roster and outcome but does not require design-direction decision rationale
- `99_delta.md` records drift and scope changes but has no section for rejected visual directions
- `SKILL.md` lists completion contract items but does not enumerate UI-bearing-specific authoring requirements
- New validators will be added as additional checks within `ddpValidation.ts` or in a new `discussionDesignHardening.ts` validator file, using the same `issue()` helper pattern, targeting error codes QFAI-DDP-019 through QFAI-DDP-025

### Historical Context

- v1.4.x: Introduction of `03_Story-Workshop.md` with HTML+CSS mock requirement for UI-bearing packs
- v1.5.x: Addition of DDP as a standalone concept; basic DDP field validators (DDP-001..006)
- v1.6.0: Expansion of DDP validators to DDP-018; introduction of competitive reference count (DDP-017) and translation policy (DDP-018) in design contracts
- v1.6.4: ChatGPT analysis report identified structural root causes of generic UI generation; identified that validator passage does not equal design quality
- v1.6.5: DDP mandatory for UI-bearing packs; Research-to-Constraint conversion step mandated; high-fidelity list/form templates added; QFAI-DPACK-008 (Mermaid in Story Workshop) added
- v1.7.0 (this release): Focus shifts from "DDP must exist" to "DDP must contain decision-quality content"; all new checks are error-severity and UI-bearing-scoped

## Inputs

### Existing Repository Facts

- `packages/qfai/src/core/validators/ddpValidation.ts` — current DDP validator (DDP-001..018); UI-bearing detection at line 23; validateCompetitiveRefs at line 595
- `packages/qfai/src/core/validators/discussionPack.ts` — DPACK-001..008; DPACK-008 checks for Mermaid in Story Workshop
- `packages/qfai/src/core/validators/discussionVisuals.ts` — VIS-001..002
- `packages/qfai/src/core/validators/discussMermaid.ts` — DPACK-009..010
- `.qfai/assistant/skills/qfai-discussion/SKILL.md` — current skill definition; completion contract at line 274
- `.qfai/discussion/README.md` — discussion pack format SSOT
- `.qfai/discussion/discussion-20260324090005338/` — most recent discussion pack (v1.6.5 scope); serves as content baseline
- `packages/qfai/package.json` — current version: 1.6.5
- `.qfai/specs/README.md` — spec format SSOT

### External References

- `qfai_v1.7x_roadmap_overview.md` (source document for this discussion)
- QFAI v1.6.4 UI/UX 設計機構分析レポート (ChatGPT analysis, SRC-0008 in prior packs) — identified generic UI root causes
- Prior discussion pack `discussion-20260324090005338` (v1.6.5) — established DDP mandatory baseline and Research-to-Constraint conversion

### Assumptions

- UI-bearing detection continues to use keyword matching on `03_Story-Workshop.md`; no change to detection heuristic in v1.7.0
- The "Design Direction Summary" section is authoritative in `03_Story-Workshop.md` (SSOT); no duplication in `02_Inception-Deck.md`
- New validator codes continue the DDP series: QFAI-DDP-019 through QFAI-DDP-025
- All new structural checks are `error` severity; heuristic/aesthetic checks are deferred to v1.7.2
- Node >=18, TypeScript 5.6.3, pnpm 9.12.3, vitest, tsup — no change to build toolchain
- Backward compatibility: non-UI-bearing packs are unaffected; no breaking change to existing validators

## Key Issues

1. **Option comparison absent**: Discussion packs pass DDP validation with a single design direction, allowing AI to lock onto the cheapest solution without comparative evaluation. No existing validator checks for option comparison presence in `03_Story-Workshop.md`.

2. **Anchor screen unselected**: Even when multiple options are mentioned informally, no structured "anchor screen" selection is recorded. Downstream agents lack a canonical reference screen to anchor the visual language.

3. **Competitive references lack structured rationale**: `04_Sources.md` captures source URLs and summaries but does not record which elements were adopted, which were rejected, and how references were locally translated. Without this, research cannot constrain implementation decisions.

4. **DDP summary absent from Story Workshop**: The Design Direction Pack fields exist in `03_Story-Workshop.md` or separate YAML contracts, but there is no structured "Design Direction Summary" section that consolidates the selected option, CTA hierarchy, and state coverage in a single retrievable block within the Story Workshop file.

5. **CTA hierarchy under-specified**: The existing `cta_hierarchy` DDP field is validated for `primary` presence (DDP-004) but does not require secondary/tertiary levels or cross-screen hierarchy consistency. Downstream agents cannot determine CTA visual weight allocation.

6. **State coverage not enumerated**: No current template or validator requires explicit enumeration of UI states (empty, loading, error, success, partial) per screen. Implementations silently omit non-happy-path states.

7. **Design anti-goals not persisted**: `99_delta.md` records scope drift but does not have a dedicated section for rejected visual directions and design anti-goals that should propagate to downstream agents as explicit prohibitions.

8. **SKILL.md does not enumerate UI-bearing authoring requirements**: The current completion contract in `SKILL.md` lists structural file checks but does not state the UI-bearing-specific authoring obligations (option comparison, anchor selection, competitive ref fields, design direction summary, state coverage).

## Recommended Direction

- Add a mandatory "Design Direction Summary" section to `03_Story-Workshop.md` template for UI-bearing packs, containing: option comparison table (>=2 options), selected anchor screen, CTA hierarchy (primary/secondary/tertiary), state coverage matrix per screen
- Upgrade `04_Sources.md` from free-form source log to structured competitive reference registry with mandatory per-entry fields: `adopted_points` (list), `rejected_points` (list), `local_translation` (how the reference informs this specific product)
- Extend `14_Review-Request.md` with a "Design Direction Decision" section requiring the reviewer to confirm that option comparison was performed, anchor was selected, and competitive refs are complete
- Add a "Rejected Visual Directions" section to `99_delta.md` with mandatory `direction`, `reason`, `anti_goal` columns
- Update `SKILL.md` completion contract to enumerate all new UI-bearing authoring requirements
- Implement new validators at `error` severity: QFAI-DDP-019 (option comparison in Story Workshop), QFAI-DDP-020 (anchor screen selection), QFAI-DDP-021 (competitive ref mandatory fields), QFAI-DDP-022 (DDP summary section in 03), QFAI-DDP-023 (CTA hierarchy depth), QFAI-DDP-024 (state coverage matrix), QFAI-DDP-025 (design anti-goals in 99_delta)

## Work Orders Summary

| Step | Role (sub-agent)     | Task title                            | Input (refs)                                        | Output (refs)              | Status (PASS/REVISE) |
| ---- | -------------------- | ------------------------------------- | --------------------------------------------------- | -------------------------- | -------------------- |
| 1    | researcher           | Baseline audit of existing validators | `ddpValidation.ts`, `discussionPack.ts`, `SKILL.md` | Gap analysis memo          | PASS                 |
| 2    | requirements-analyst | Key Issues enumeration                | Gap analysis memo, roadmap overview                 | `01_Context.md` Key Issues | PASS                 |
| 3    | orchestrator         | Context synthesis and direction       | All inputs, repo SSOT                               | `01_Context.md`            | PASS                 |
