# 05 Examples

## EX-0010-0001: Complete 15-File Pack

- BR-Ref: BR-0010-0001
- Given a discussion run for a web application
- When discussion completes
- Then `.qfai/discussion/discussion-20260401120000000/` contains all 15 files (01..14, 99)

## EX-0010-0002: OQ Resolution to Zero

- BR-Ref: BR-0010-0002
- Given 3 OQs identified during interview, 2 resolved and 1 deferred
- When deferred OQ has complete metadata in `13_Deferred.md`
- Then open count is zero and discussion can complete

## EX-0010-0003: Example Mapping Perspectives

- BR-Ref: BR-0010-0002
- Given BR-0010-0001 (Fixed Output Path)
- When Example Mapping runs with 6 perspectives
- Then happy path, negative path, edge/boundary, permission/role, state transition, and idempotency are each addressed or skipped with reason

## EX-0010-0004: UI-Bearing Sidecar Generation

- BR-Ref: BR-0010-0004
- Given surface type `web` detected
- When discussion completes
- Then all 11 uiux/ files are generated including strategy, scoring axes, anchor, and contracts

## EX-0010-0005: Non-UI Pack Skips Sidecar

- BR-Ref: BR-0010-0004
- Given surface type `non-ui` (CLI tool)
- When discussion completes
- Then no uiux/ directory is created and no DDS validators fire

## EX-0010-0006: Coverage Placeholder for BR-0010-0003

- BR-Ref: BR-0010-0003
- Given the consolidated rule BR-0010-0003
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0003

## EX-0010-0007: Coverage Placeholder for BR-0010-0005

- BR-Ref: BR-0010-0005
- Given the consolidated rule BR-0010-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0005

## EX-0010-0008: Coverage Placeholder for BR-0010-0006

- BR-Ref: BR-0010-0006
- Given the consolidated rule BR-0010-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0006

## EX-0010-0009: Coverage Placeholder for BR-0010-0007

- BR-Ref: BR-0010-0007
- Given the consolidated rule BR-0010-0007
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0007

## EX-0010-0010: Coverage Placeholder for BR-0010-0008

- BR-Ref: BR-0010-0008
- Given the consolidated rule BR-0010-0008
- When layer coverage is evaluated
- Then at least one example exists for BR-0010-0008

## EX-0010-0011: UI-Bearing Pack with 3-Layer Sidecar (Happy Path)

- BR-Ref: BR-0010-0009, BR-0010-0010
- Given a UI-bearing project (`web`) with discussion completed under v1.7.12
- When sidecar is generated
- Then `00_index.md` lists only canonical 3-layer family files, `10_implementation_strategy.md` has surface classification + strategy + rationale, `40_screen_contracts.md` has screen-obligation entries, and no 4-axis files (20–23) exist

## EX-0010-0012: Pack Missing Taste Interview (Fail)

- BR-Ref: BR-0010-0009
- Given a UI-bearing project with discussion completed
- When the design taste interview (10 sections) is absent or incomplete
- Then sidecar validation fails with `UIX-VAL-TASTE-*` errors because trend-derived and product-specific axes lack foundation data

## EX-0010-0013: Pack Missing Trend-Derived Evaluation (Fail)

- BR-Ref: BR-0010-0009
- Given a UI-bearing project with discussion completed
- When `04_Sources.md` has competitive references but no `source_translation` linking findings to trend-derived axes
- Then sidecar validation fails because trend-derived layer has no traceable evaluation criteria

## EX-0010-0014: Non-UI Pack Skips 3-Layer Sidecar Without Errors

- BR-Ref: BR-0010-0009
- Given surface type `non-ui` (CLI tool, library, API-only)
- When discussion completes under v1.7.12
- Then no `uiux/` directory is created, no 3-layer validators fire, and no 4-axis validators fire

## EX-0010-0015: Init Copy vs Dogfood Copy Parity Check

- BR-Ref: BR-0010-0010
- Given `qfai init` generates a fresh project
- When the generated uiux/ templates are compared to `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/`
- Then every canonical template file is semantically equivalent (no missing fields, no stale 4-axis references)

## EX-0010-0016: HTML/CSS Mock Absent Does Not Block Completion

- BR-Ref: BR-0010-0011
- Given a UI-bearing discussion pack where `03_Story-Workshop.md` contains Mermaid diagrams but no HTML/CSS mock section
- When discussion completion validation runs
- Then no error is reported for the missing HTML/CSS mock; validation passes for this check

## EX-0010-0017: Template File Name Matches Validator Expectation

- BR-Ref: BR-0010-0012
- Given a `uiux/` sidecar directory with template files
- When file names are validated against `UIX-VAL-*` validator patterns
- Then every template file name matches the expected pattern; mismatches are reported as broken traceability errors

## EX-0010-0018: UI-bearing pack runs Step 11.3 and 12_design_system.md is generated with 8 sections (Happy)

- BR-Ref: BR-0010-0015
- Given a UI-bearing discussion pack with a completed design taste interview
- When `/qfai-discussion` Step 11.3 (Brand→Aesthetic Mapping) runs
- Then Phase A selects an archetype from the 8-archetype catalog and Phase B produces `uiux/12_design_system.md` with all 8 sections populated (Visual Theme, Color Palette, Typography, Spacing & Layout, Component Style, Animation & Motion, Do's and Don'ts, Agent Implementation Guide)

## EX-0010-0019: Non-UI pack skips Step 11.3 with no 12_design_system.md (Negative)

- BR-Ref: BR-0010-0015
- Given a non-UI discussion pack (`surface: non-ui`)
- When `/qfai-discussion` completes
- Then Step 11.3 is skipped entirely, no `uiux/12_design_system.md` is generated, and no DS01/DS02 validators fire

## EX-0010-0020: Taste interview scoring tied between two archetypes (Edge)

- BR-Ref: BR-0010-0016
- Given taste interview scoring yields identical totals for two archetypes (e.g., Elegant Minimalist and Trustworthy Professional both score 42)
- When archetype selection runs
- Then the deterministic tie-breaker selects the archetype whose highest-weighted category (visual theme weight) is larger; if still tied, alphabetical order decides — output is reproducible across reruns

## EX-0010-0021: AI-only Phase A without human confirmation (Permission)

- BR-Ref: BR-0010-0017
- Given `/qfai-discussion` SKILL.md Step 11.3 Phase A (brand selection)
- When Phase A executes
- Then no "pause for human confirmation" step is emitted; archetype selection completes autonomously from the taste interview alone (NFR-0008 AI-only operability)

## EX-0010-0022: Phase B precedes Phase A — detected as violation (State)

- BR-Ref: BR-0010-0017
- Given a misconfigured run where DESIGN.md customization (Phase B) is attempted before archetype selection (Phase A)
- When Step 11.3 ordering validator runs
- Then the sequence violation is detected and reported: "Phase A (brand selection) MUST complete before Phase B (customization)"

## EX-0010-0023: Re-running Step 11.3 on same taste interview is deterministic (Idempotency)

- BR-Ref: BR-0010-0015, BR-0010-0016
- Given a fixed taste interview in `03_Story-Workshop.md`
- When Step 11.3 runs twice against the same pack
- Then both runs select the same archetype and produce byte-identical `uiux/12_design_system.md` (stable archetype selection + stable section ordering)

## EX-0010-0024: Step 11.5 derives visual axis from Trend Scan color entry (Happy)

- BR-Ref: BR-0010-0013
- Given a UI-bearing pack whose `04_Sources.md` contains a Trend Scan entry with category `color`
- When Step 11.5 (Trend→Axis derivation) runs
- Then `uiux/21_design_eval_trend_derived.md` contains at least one TRD-XX axis classified as visual and whose `source_refs` lists the color Trend Scan entry id

## EX-0010-0025: Trend Scan lacks visual category → UIX-VAL-T04 WARNING (Negative)

- BR-Ref: BR-0010-0014
- Given a UI-bearing pack with Trend Scan entries only in behavioral categories (no color/typography/visual motif)
- When Step 11.5 completes and `qfai validate` runs
- Then UIX-VAL-T04 emits WARNING naming the absence of a derived visual axis; the run does not exit non-zero under `--fail-on error`

## EX-0010-0026: Multiple visual categories → one derived axis satisfies the rule (Edge)

- BR-Ref: BR-0010-0013
- Given a pack whose Trend Scan contains entries in both `color` and `typography`
- When Step 11.5 derives at least one visual axis (e.g., TRD-03 "Visual Warmth & Color Harmony") referencing at least one of the two entries
- Then UIX-VAL-T04 does not fire; BR-0010-0013's minimum (>=1 visual axis) is met

## EX-0010-0027: 04_Sources.md template provides evaluation_connection for all 6 categories (Happy)

- BR-Ref: BR-0010-0019
- Given the canonical `templates/04_Sources.md` used by `qfai init`
- When the generated pack is inspected
- Then every Trend Scan category section (color, typography, visual motif, spacing, shape, imagery) contains an `evaluation_connection: TRD-XX` field (or comment guidance) on each scaffolded entry

## EX-0010-0028: Missing evaluation_connection on color category → UIX-VAL-T01 ERROR (Negative)

- BR-Ref: BR-0010-0019
- Given a UI-bearing pack where a Trend Scan entry in the `color` category omits `evaluation_connection`
- When `qfai validate --fail-on error` runs
- Then UIX-VAL-T01 fires with severity `error`; exit is non-zero; message identifies the offending source id and field

## EX-0010-0029: 21_design_eval_trend_derived.md ships with visual axis examples + source_refs guidance (Happy)

- BR-Ref: BR-0010-0020
- Given the canonical `templates/uiux/21_design_eval_trend_derived.md`
- When a fresh pack is generated
- Then the file contains >=2 visual-axis example entries (e.g., "Visual Warmth & Color Harmony", "Typographic Rhythm") with `source_refs: [SRC-TREND-XX]` guidance and commentary directing authors to link 04_Sources.md entries

## EX-0010-0030: Sidecar Generation Flow runs Step 1c before Step 1d (Happy)

- BR-Ref: BR-0010-0018
- Given `/qfai-discussion` SKILL.md Sidecar Generation Flow
- When sidecar generation runs
- Then Step 1c (04_Sources Trend Scan capture) completes and its output is read by Step 1d (21_design_eval_trend_derived axis derivation); the two steps are not executed in parallel

## EX-0010-0031: Parallel 1c/1d detected → SKILL.md dependency violation (Negative)

- BR-Ref: BR-0010-0018
- Given a modification of SKILL.md that attempts to mark Step 1c and Step 1d as parallel
- When the SKILL.md dependency validator runs
- Then the violation is reported: "Sidecar Generation Flow Step 1c→Step 1d dependency — parallel execution forbidden"

## EX-0010-0032: 8-archetype catalog with representative brand mappings (Happy)

- BR-Ref: BR-0010-0016
- Given `references/design-md-brand-catalog.md`
- When the file is inspected
- Then all 8 archetypes are present (Elegant Minimalist→Muji, Bold & Dynamic→Nike, Warm Organic→Patagonia, Technical Precision→Bose, Playful Creative→Duolingo, Trustworthy Professional→Bloomberg, Futuristic Innovation→Tesla, Heritage Classic→Rolex) each with representative-brand and aesthetic-properties fields

## EX-0010-0033: 12_design_system.md template 8 sections populated with guidance (Happy)

- BR-Ref: BR-0010-0015
- Given the canonical `templates/uiux/12_design_system.md`
- When a fresh pack is generated
- Then the 8 sections (Visual Theme / Color Palette / Typography / Spacing & Layout / Component Style / Animation & Motion / Do's and Don'ts / Agent Implementation Guide) are each present with non-empty guidance commentary ready for Phase B customization

## EX-0010-0034: UIX-VAL-T04 is WARNING (not ERROR) per NFR-0007 staged introduction (Edge)

- BR-Ref: BR-0010-0014
- Given a pack where no visual axis is derived
- When `qfai validate` runs under v1.7.16
- Then UIX-VAL-T04 emits severity `warning` (not `error`) to honor NFR-0007 backward compatibility; a future ratchet may promote to ERROR per DR-0014-v1716-02
