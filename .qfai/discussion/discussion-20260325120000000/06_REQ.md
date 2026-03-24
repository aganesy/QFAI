# 06_REQ

## Priority Legend

| Priority | Meaning                                  |
| -------- | ---------------------------------------- |
| must     | Release blocker; must ship in v1.7.0     |
| should   | High value; ship in v1.7.0 if possible   |
| could    | Nice to have; consider for v1.7.1        |
| wont     | Out of scope for v1.7.0                  |

## Requirements

### UI-Bearing Detection and Gating

| REQ-ID   | Title                                  | Description                                                                                                                                                                                                                                                                                     | Source              | Priority | Status |
| -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------ |
| REQ-0001 | UI-bearing detection in discussion pack | The validator must scan the discussion pack — specifically `03_Story-Workshop.md` and the DDP section — for UI artifact keywords and section markers (screen, ui, interface, mock, layout, design, wireframe, prototype) to determine whether a pack is UI-bearing. Detection triggers all enhanced structural requirements. Non-UI packs must produce zero additional issues from any v1.7.0 validator. | SRC-0002, SRC-0003, SRC-0005 | must   | draft  |

### Design Direction Summary

| REQ-ID   | Title                                              | Description                                                                                                                                                                                                                                                                                              | Source              | Priority | Status |
| -------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------ |
| REQ-0002 | Design Direction Summary section mandatory for UI-bearing packs | `03_Story-Workshop.md` must contain a `## Design Direction Summary` (DDS) section for any UI-bearing discussion pack. The DDS must include: `visual_thesis` (single descriptive sentence), `selected_option` (which option was chosen and why), `anchor_screen` (the primary screen driving direction), `anti_goals` (at least one explicit pattern to avoid), `cta_hierarchy` (primary / secondary / tertiary), and `state_coverage` (list of UI states addressed). Absence of the section or any required sub-field emits `error` severity. | SRC-0001, SRC-0005 | must     | draft  |

### Option Comparison

| REQ-ID   | Title                                                   | Description                                                                                                                                                                                                                                                                                  | Source              | Priority | Status |
| -------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------ |
| REQ-0003 | Option comparison (2–3 options) mandatory for UI-bearing packs | UI-bearing packs must document 2–3 design options in the DDS or a dedicated options section of `03_Story-Workshop.md`. Each option must include: `option_id`, `summary`, `pros` (at least one item), `cons` (at least one item), and `avoided_antipatterns`. Fewer than 2 options or any option with empty `pros` or `cons` emits `error` severity. | SRC-0001, SRC-0002, SRC-0005 | must | draft  |

### Anchor Screen

| REQ-ID   | Title                                               | Description                                                                                                                                                                                                                              | Source              | Priority | Status |
| -------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------ |
| REQ-0004 | Selected anchor screen mandatory for UI-bearing packs | The DDS `anchor_screen` field must name the primary screen that anchors the design direction. The value must be non-empty. Absence emits `error` severity. The anchor screen name must correspond to a screen mock or screen section present elsewhere in the pack. | SRC-0001, SRC-0005 | must     | draft  |

### Competitive Reference Registry

| REQ-ID   | Title                                                                     | Description                                                                                                                                                                                                                                                                                                                                      | Source              | Priority | Status |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | -------- | ------ |
| REQ-0005 | Competitive reference registry with adopted_points, rejected_points, local_translation | `04_Sources.md` must include a `## Competitive Reference Registry` section for UI-bearing packs containing at least 3 competitive reference entries. Each entry must be a YAML block (or Markdown table row) with all three mandatory fields: `adopted_points` (what from this reference is adopted, non-empty), `rejected_points` (what is explicitly not adopted, non-empty), and `local_translation` (how the adopted points are translated to this project's context, non-empty). Any absent or empty mandatory field emits `error` severity. | SRC-0001, SRC-0002, SRC-0003, SRC-0005 | must | draft  |

### CTA Hierarchy

| REQ-ID   | Title                                                        | Description                                                                                                                                                                                                                                      | Source              | Priority | Status |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | -------- | ------ |
| REQ-0006 | CTA hierarchy definition mandatory for UI-bearing packs      | The DDS `cta_hierarchy` field must define at minimum a `primary` CTA action. Defining `secondary` and `tertiary` is recommended but not enforced. Absence of `primary` emits `error` severity. This check runs during discussion-phase validation, not only during prototyping-phase validation. | SRC-0001, SRC-0002, SRC-0005 | must | draft  |

### State Coverage

| REQ-ID   | Title                                                           | Description                                                                                                                                                                                                                                                                               | Source              | Priority | Status |
| -------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------ |
| REQ-0007 | State coverage definition mandatory for UI-bearing packs        | The DDS `state_coverage` field must enumerate the UI states that the pack addresses. The four states `empty`, `loading`, `error`, and `populated` must all be present. Any state absent from the list emits `error` severity. This requirement applies in the discussion phase and supersedes the warning-level check in earlier versions. | SRC-0001, SRC-0002, SRC-0005 | must | draft  |

### Design Anti-Goals

| REQ-ID   | Title                                                        | Description                                                                                                                                                                                                                                            | Source              | Priority | Status |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | -------- | ------ |
| REQ-0008 | Design anti-goals mandatory for UI-bearing packs             | The DDS `anti_goals` field must contain at least one explicit design anti-goal (a pattern, style, or approach being consciously avoided). Generic placeholder text ("not applicable", "none", "TBD") does not satisfy the requirement. Absence or generic-only content emits `error` severity. | SRC-0001, SRC-0002, SRC-0005 | must | draft  |

### Validator Severity

| REQ-ID   | Title                                              | Description                                                                                                                                                                                                                                                                                   | Source              | Priority | Status |
| -------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------ |
| REQ-0009 | All new structural validators emit error severity  | Every validator introduced in v1.7.0 that checks structural completeness of UI-bearing discussion packs must emit `"error"` severity, not `"warning"`. Severity must not be toggled by `qualityProfile` in v1.7.0. The `issue()` helper must be called with `"error"` as the severity argument. This prevents UI-bearing work from advancing with generic or missing design inputs. | SRC-0004, SRC-0005 | must | draft  |

### Template Updates

| REQ-ID   | Title                                                            | Description                                                                                                                                                                                                                                                                               | Source              | Priority | Status |
| -------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------ |
| REQ-0010 | `14_Review-Request.md` captures design-direction decisions       | The `14_Review-Request.md` template must be updated to include a `## Design Direction Lock` section with fields: `design_direction_locked` (boolean), `selected_option_id`, `selected_option_rationale`, and `reviewer_confirmation`. This section is required for UI-bearing packs before implementation work may begin. | SRC-0001, SRC-0005, SRC-0007 | must | draft  |
| REQ-0011 | `99_delta.md` captures rejected visual directions with recurrence prevention | The `99_delta.md` template must be updated to include a `## Rejected Visual Directions` section. Each entry must record: `direction_summary` (what was proposed), `rejection_reason` (why it was rejected), and `recurrence_prevention` (the rule or constraint that prevents this direction from being re-proposed). | SRC-0001, SRC-0005 | must | draft  |
| REQ-0012 | `SKILL.md` updated with new UI-bearing authoring requirements    | The `qfai-discussion/SKILL.md` skill document must be updated to describe: the DDS section format and required sub-fields, the competitive reference registry format with all mandatory fields, the option comparison requirement, the anchor screen selection requirement, and the rule codes for each new validator (QFAI-DDP-019 and above). | SRC-0001, SRC-0004, SRC-0005 | must | draft  |
| REQ-0013 | Discussion templates updated for new sections                    | The init-time template assets for `03_Story-Workshop.md` and `04_Sources.md` in `packages/qfai/assets/init/` must be updated to include the DDS section and the Competitive Reference Registry section respectively, with all required field placeholders populated with instructional comments. | SRC-0001, SRC-0004, SRC-0005 | must | draft  |

### Backward Compatibility

| REQ-ID   | Title                                                    | Description                                                                                                                                                                                                      | Source              | Priority | Status |
| -------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------ |
| REQ-0014 | Non-UI discussion packs remain unchanged                 | Any discussion pack that does not contain UI-bearing keywords or a DDP section must produce exactly zero new issues when validated against v1.7.0. All new validators must short-circuit immediately when `isUiBearing` is false. Existing fixture tests for non-UI packs must pass without modification to the fixtures. | SRC-0004, SRC-0005 | must | draft  |
