# 08 Glossary

Discussion pack: discussion-20260325120000000
Version context: QFAI v1.7.0 "Discussion Design Hardening"
Last updated: 2026-03-25

---

## Terms

| Term | Definition | Context | Source |
|---|---|---|---|
| UI-bearing discussion pack | A discussion pack in which the associated work involves user interface or user experience concerns, determined by detecting UI-related artifacts (e.g., screen specs, wireframe references, component lists) present in the pack's source documents. Triggers mandatory DDS authoring in 03_Story-Workshop.md. | v1.7.0 core concept; drives conditional validation path | QFAI v1.7.0 design specification |
| Design Direction Summary (DDS) | A mandatory structured section added to 03_Story-Workshop.md for every UI-bearing discussion pack. It records the option comparison outcome, identifies the selected anchor screen, defines CTA hierarchy, specifies state coverage, and lists design anti-goals. Absent or incomplete DDS causes a structural validation error. | v1.7.0 new artifact | QFAI v1.7.0 design specification |
| Design Direction Pack (DDP) | The formal artifact set produced by the QFAI discussion flow that captures research synthesis, story breakdowns, and acceptance criteria for a given feature or initiative. The DDP is the deliverable validated by QFAI-DDP-001..018. | Existing concept; DDS is a sub-section within the DDP for UI-bearing packs | QFAI v1.6.x specification; validators QFAI-DDP-001..018 |
| Option comparison | The activity of evaluating two to three distinct screen design options—documented with rationale—before committing to one. The outcome of an option comparison is captured in the DDS and must name the rejected options alongside the reasons for rejection. | DDS sub-element; required for UI-bearing packs | QFAI v1.7.0 design specification |
| Selected anchor screen | The single design option chosen as the reference screen after option comparison. All subsequent implementation decisions for the feature must be traceable to this screen. The identifier of the anchor screen is recorded in the DDS. | DDS sub-element; traceability anchor for implementation | QFAI v1.7.0 design specification |
| Competitive reference registry | An enhanced version of 04_Sources.md that, for UI-bearing packs, requires each referenced competitive or inspirational source to be annotated with `adopted_points`, `rejected_points`, and `local_translation` fields. Ensures deliberate, accountable extraction of patterns from external references. | v1.7.0 enhancement to 04_Sources.md | QFAI v1.7.0 design specification |
| adopted_points | A structured field in the competitive reference registry listing the specific design patterns, interactions, or conventions that were consciously taken from a given reference and incorporated into the current design. | Sub-field of competitive reference registry | QFAI v1.7.0 design specification |
| rejected_points | A structured field in the competitive reference registry listing the specific patterns from a reference that were evaluated but deliberately excluded, along with the reasoning for exclusion. | Sub-field of competitive reference registry | QFAI v1.7.0 design specification |
| local_translation | A structured field in the competitive reference registry describing how an adopted pattern was adapted to fit the product's own design language, constraints, or user model. Bridges the gap between raw inspiration and context-appropriate implementation. | Sub-field of competitive reference registry | QFAI v1.7.0 design specification |
| CTA hierarchy | An explicit, ordered definition of the primary, secondary, and tertiary call-to-action controls on each key screen. Documented in the DDS to prevent ambiguous or conflicting affordances from reaching implementation. A screen may define fewer than three levels but must define at least a primary CTA. | DDS sub-element | QFAI v1.7.0 design specification |
| State coverage | The enumeration of all meaningful UI states that each key screen must handle, including but not limited to: loading, empty, error, and populated. Additional states (e.g., partial-load, offline, permission-denied) must be listed where applicable. Documented in the DDS. | DDS sub-element; prevents unhandled UI states from reaching implementation | QFAI v1.7.0 design specification |
| Design anti-goals | An explicit list of design patterns, interaction paradigms, or visual approaches that have been decided against for the current feature. Anti-goals are recorded in the DDS to make exclusionary decisions visible, prevent design drift, and provide reviewers with clear rejection criteria. | DDS sub-element | QFAI v1.7.0 design specification |
| UI-bearing artifact detection | The automated mechanism by which the QFAI validator determines whether a discussion pack is UI-bearing. Detection is based on the presence of UI-related artifacts (e.g., declared screen specs, wireframe file references, component inventory entries) rather than on keyword matching alone. Artifact-presence-based detection reduces false positives and false negatives. | v1.7.0 validation logic; see TC-2 | QFAI v1.7.0 design specification; TC-2 |
| Quality profile (standard / high / strict) | A configurable setting on a discussion pack that governs how strictly validators are applied. `standard` enforces structural correctness; `high` adds heuristic completeness checks; `strict` treats all warnings as errors. The profile infrastructure is preserved in v1.7.0; new DDS validators default to error severity independent of profile. | Existing concept; infrastructure preserved in v1.7.0 | QFAI v1.6.x specification |
| Validator severity (error / warning / info) | The three levels at which a validator can report a finding. `error` blocks pack acceptance; `warning` is advisory and does not block; `info` is informational only. New structural validators introduced in v1.7.0 are assigned `error` severity by default. | Existing concept; extended in v1.7.0 | QFAI v1.6.x specification |
| Discussion pack | The directory-based artifact produced by running `/qfai-discussion`. Contains numbered markdown files (01 through n) that together constitute the research, story breakdown, sources, and acceptance criteria for a unit of work. Validated by the QFAI-DPACK series. | Existing concept | QFAI v1.6.x specification; validators QFAI-DPACK-001..010 |
| Structural check | A validator that asserts the required presence, position, or schema of a document section or field. A structural check fails if the artifact is missing or malformed, regardless of its content quality. Structural checks are the primary category of new validators introduced in v1.7.0. | v1.7.0 distinction; contrasts with heuristic check | QFAI v1.7.0 design specification |
| Heuristic check | A validator that evaluates the quality or completeness of content rather than its mere presence. Heuristic checks may assess length, vocabulary diversity, or logical coherence. They typically produce `warning` or `info` severity findings. Existing QFAI-VIS-001..002 are examples of heuristic checks. | v1.7.0 distinction; contrasts with structural check | QFAI v1.6.x specification; validators QFAI-VIS-001..002 |

---

## Abbreviations

| Abbreviation | Expansion | Notes |
|---|---|---|
| DDS | Design Direction Summary | New in v1.7.0; mandatory section in 03_Story-Workshop.md for UI-bearing packs |
| DDP | Design Direction Pack | Existing artifact; validated by QFAI-DDP-001..018 |
| CTA | Call to Action | Used in CTA hierarchy definition within DDS |
| UI | User Interface | Key discriminator for UI-bearing pack detection |
| UX | User Experience | Broader context for UI-bearing classification; UX artifacts also trigger UI-bearing detection |
| OQ | Open Question | Standard QFAI marker for unresolved items within a discussion pack |
| REQ | Requirement | Functional requirement marker used across QFAI discussion pack documents |
| NFR | Non-Functional Requirement | Requirement covering performance, reliability, security, and similar concerns |
| SRC | Source | Abbreviation used in 04_Sources.md entries and the competitive reference registry |
| SSOT | Single Source of Truth | Principle underlying QFAI's anchor screen and DDS approach |
| RCP | Review Checkpoint | Milestone marker within the QFAI discussion flow |
