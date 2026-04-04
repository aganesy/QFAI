# 03 Acceptance Criteria

## AC-0010-0001: 15-File Pack Completeness

Given a discussion run, when it completes, then all 15 mandatory files (01_Context..14_Review-Request, 99_delta) exist and are populated.

## AC-0010-0002: Inception Deck Mermaid Diagram

Given the Inception Deck, when `02_Inception-Deck.md` is produced, then it contains at least one Mermaid diagram in fenced blocks.

## AC-0010-0003: Story Workshop Mermaid Diagram (HTML Mock Optional)

Given the Story Workshop, when `03_Story-Workshop.md` is produced, then it contains at least one Mermaid diagram; HTML+CSS mock section is optional/fallback reference material (not a completion gate).

## AC-0010-0004: Example Mapping 6-Perspective Coverage

Given a BR/AC candidate, when Example Mapping runs, then all 6 mandatory perspectives are covered or intentionally skipped with reason.

## AC-0010-0005: OQ Register Zero Open Count

Given discussion completion, when `11_OQ-Register.md` is checked, then `Disposition: open` count is zero.

## AC-0010-0006: OQ Register 11-Column Schema

Given `11_OQ-Register.md`, when it is checked, then all 11 mandatory columns are present (OQ-ID, Title, Gate, Disposition, Owner, Rationale, Options, Recommendation, Next-Decision-Point, Due, Evidence).

## AC-0010-0007: Deferred Metadata 11-Column Schema

Given `13_Deferred.md`, when it is checked, then all 11 mandatory columns are present.

## AC-0010-0008: DDP Design Direction Summary

Given a UI-bearing pack, when `03_Story-Workshop.md` is checked, then it includes Design Direction Summary with all 6 subsections.

## AC-0010-0009: UI-Bearing Sidecar Generation (Canonical Family)

Given a UI-bearing project, when discussion completes, then all sidecar files listed in `00_index.md` are generated using the canonical 3-layer family only (no legacy 4-axis files 20–23); partial generation is forbidden.

## AC-0010-0010: RCP Full Roster Execution

Given a review cycle, when RCP runs, then all 12 reviewers execute in order (1-10, then devils-advocate, then pattern-doubler).

## AC-0010-0011: Competitive Reference Registry

Given a UI-bearing pack, when `04_Sources.md` is checked, then it includes 3+ competitive references with adopted_points, rejected_points, and local_translation fields (no placeholders).

## AC-0010-0012: SKILL.md 3-Layer Model Exclusivity

Given the qfai-discussion SKILL.md, when its content is inspected, then it teaches the 3-layer evaluation model (invariant / trend-derived / product-specific) exclusively; no references to the old 4-axis model (usability / consistency / accessibility / delight as separate axes) remain.

## AC-0010-0013: Init Generates 3-Layer Family Only

Given `qfai init` execution, when uiux/ templates are generated, then only the canonical 3-layer family files are created; old 4-axis files (20_eval_axis_usability, 21_eval_axis_consistency, 22_eval_axis_accessibility, 23_eval_axis_delight) are not generated.

## AC-0010-0014: Canonical Index Manifest

Given the uiux/ sidecar, when `00_index.md` is checked, then it lists only the canonical 3-layer family files; no legacy 4-axis entries appear.

## AC-0010-0015: Strategy Template Strong Schema

Given `10_strategy.md`, when it is checked, then it contains mandatory fields: surface classification, implementation strategy, and rationale — each with non-placeholder values.

## AC-0010-0016: Contracts Screen-Obligation Schema

Given `40_screen_contracts.md`, when it is checked, then each screen entry contains mandatory fields: screen ID, obligations list, secondary_tasks, and acceptance signals — each with non-placeholder values.

## AC-0010-0017: Sources Trend Evaluation Support

Given `04_Sources.md` in a UI-bearing pack, when competitive references are checked, then each trend-derived evaluation axis has a corresponding `source_translation` field linking the research finding to the axis criterion.

## AC-0010-0018: HTML/CSS Mock Not a Completion Gate

Given discussion completion validation, when the completion gate is evaluated, then HTML/CSS mock presence or absence does not affect pass/fail status; it is informational only.

## AC-0010-0015: prototyping.yaml Generated

Given a discussion-pack is being completed, when all 15 markdown files are finalized, then prototyping.yaml is also generated with required fields (recommended_mode, rationale, allowed_modes, surface).

## AC-0010-0016: prototyping.yaml Surface Classification

Given a UI-bearing discussion-pack, when prototyping.yaml is generated, then surface field is set to the detected surface type (web, mobile, desktop, mixed). For non-UI packs, surface is "non-ui".
