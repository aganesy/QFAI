# Implementation Strategy

## Strategy Entries

<!-- One entry per surface decision. Use the strong 8-field schema below. -->

### Surface: [Surface Name]

- surface: [web|mobile|desktop|cli|mixed]
- selection_required: [true|false]
- decision: [template|component-library|design-system|native-pattern|bespoke|none]
- candidate_options:
  <!-- Nested bullets are canonical. Inline CSV accepted for compatibility. -->
  - [Option A description]
  - [Option B description]
- chosen_option: [Option X]
- rationale: [why this approach was selected]
- verification_expectations: [how to verify the decision was implemented correctly]
- notes_for_reviewer: [any additional context for the reviewer]

## Strategy Selection Guidance

- Select one implementation approach based on project constraints and surface type.
- Reference 3-layer evaluation family (20-23) for evaluation criteria.
- One complete strategy definition per project; avoid verbose alternatives here.
- When `selection_required: true`, `candidate_options` must list 2+ entries.
- When `decision: none` and `selection_required: false`, the project has no UI implementation decision.

## Cross-references

- Surface classification: see `01_Context.md` `## UI-bearing Classification`
- Scoring axes: see `20_design_eval_invariant.md`, `21_design_eval_trend_derived.md`, `22_design_eval_product_specific.md`, `23_design_eval_aggregate.md`
- Option comparison: see `30_option_comparison.md`
- Selected anchor: see `31_selected_anchor_screen.md`
