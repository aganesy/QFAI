# 05_Scope

## In Scope

1. **Design Direction Summary (DDS) section in `03_Story-Workshop.md` template** — A new mandatory section capturing the approved design direction before any screen mock work begins; required for all UI-bearing discussion packs.
2. **UI-bearing detection logic enhancement** — Strengthen keyword/section scanning in `ddpValidation.ts` to reliably identify packs that contain UI artifact work (screens, mocks, interfaces, layouts) and gate the enhanced requirements accordingly.
3. **Option comparison validator (error)** — Validator asserting that UI-bearing packs present 2–3 design options with documented pros, cons, and the rationale for the selected option; emits `error` severity on violation.
4. **Anchor screen selection validator (error)** — Validator asserting that UI-bearing packs explicitly name the selected anchor screen and its design direction; emits `error` severity when absent.
5. **Competitive reference field validator (error)** — Mandatory fields `adopted_points`, `rejected_points`, and `local_translation` per competitive reference entry in `04_Sources.md`; emits `error` severity when any required field is absent or empty.
6. **DDP summary presence validator (error)** — Validator confirming that a Design Direction Summary is present in `03_Story-Workshop.md` for UI-bearing packs; emits `error` severity when absent.
7. **CTA hierarchy check in discussion phase** — Validator asserting that the primary CTA hierarchy (primary / secondary / tertiary) is explicitly defined in the DDS for UI-bearing packs; runs during discussion validation.
8. **State coverage check in discussion phase** — Validator asserting that at minimum four UI states (empty, loading, error, populated) are addressed in UI-bearing packs; runs during discussion validation.
9. **Design anti-goals check in discussion phase** — Validator asserting that the DDS includes at least one explicit design anti-goal (pattern or style to avoid); runs during discussion validation.
10. **`SKILL.md` update with new UI-bearing authoring requirements** — The `qfai-discussion` skill document is updated to describe the DDS section, competitive reference registry format, and the intent behind each new validator.
11. **`14_Review-Request.md` template enhancement** — Template updated to capture design-direction decisions, the selected option rationale, and the reviewer's confirmation that direction is locked before implementation.
12. **`99_delta.md` template enhancement** — Template updated to record rejected visual directions with explicit recurrence-prevention notes so the same direction is not re-proposed in future iterations.
13. **`04_Sources.md` template enhancement with competitive reference registry** — Source template updated to require `adopted_points`, `rejected_points`, and `local_translation` fields for any source used as a competitive UI reference.

## Out of Scope

1. **Screenshots, browser QA, and external critique adapters** — No browser execution, screenshot diffing, or external tool integration in v1.7.0.
2. **Scoring or browser execution** — No numeric scoring rubric or runtime browser-based validation.
3. **Heuristic and aesthetic detection** — Detection based on visual aesthetics or NLP heuristics is deferred to v1.7.2.
4. **`qualityProfile`-based severity toggling** — The infrastructure exists in v1.6.5; gating severity by `qualityProfile` is not activated in v1.7.0. All new validators emit `error` unconditionally for UI-bearing packs.
5. **New CLI commands** — No new `qfai` subcommands; all changes operate within the existing `validate` pipeline.
6. **Non-UI discussion packs** — Packs that do not contain UI-bearing work remain fully unaffected by all new validators.

## Success Criteria

| Criterion                                                                                                | Measurable Target                                                                                             |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| All new structural validators emit `error` for UI-bearing packs that violate requirements                | Zero validators that emit `warning` for missing structural UI inputs; confirmed by unit test assertions        |
| Non-UI discussion packs produce no new issues when run against v1.7.0 validators                         | Existing fixture-based tests for non-UI packs pass without modification                                       |
| `03_Story-Workshop.md` template includes DDS section with all required sub-fields                        | Template diff shows DDS section with `visual_thesis`, `selected_option`, `anchor_screen`, `anti_goals`, `cta_hierarchy`, `state_coverage` |
| `04_Sources.md` template enforces `adopted_points`, `rejected_points`, `local_translation` per ref entry | Competitive ref validator test: fixture missing any field produces exactly one `error` per missing field       |
| `14_Review-Request.md` captures design-direction lock confirmation                                       | Template diff shows `design_direction_locked` field and selected-option rationale section                      |
| `99_delta.md` captures rejected visual directions with recurrence-prevention notes                       | Template diff shows `rejected_directions` section with `recurrence_prevention` sub-field                       |
| `SKILL.md` describes all new authoring requirements                                                      | Skill document mentions DDS, competitive reference registry, and each new validator rule code                  |
| All new validators have unit tests with passing and failing fixtures                                     | `pnpm test` passes; test coverage for each new validator function is 100% branch coverage                     |
| Total validation time increase is under 500ms on a representative pack                                   | Benchmarked against a 15-file discussion pack; delta measured with `--timing` flag                             |

## Assumptions

- The existing `UI_BEARING_KEYWORDS_RE` pattern in `ddpValidation.ts` is the canonical detection point; v1.7.0 may extend keyword list but does not replace the mechanism.
- `04_Sources.md` is the correct home for the competitive reference registry; `03_Story-Workshop.md` hosts the Design Direction Summary.
- All validator changes target the `packages/qfai/src/core/validators/` directory and follow existing `issue()` helper conventions.
- The `review-roster.yml` roles that currently gate UI-bearing specs remain the approvers for DDS completion.
