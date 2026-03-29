# 08 Glossary

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Terms

| Term                    | Definition                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| UIX-VAL                 | Deterministic validator rule family for UI/UX artifacts. Shape/completeness/contradiction checks only. No taste.    |
| UIX-REV                 | Semantic reviewer check family for UI/UX artifacts. Strategy quality, scoring weakness, generic fallback risk.      |
| Deterministic validator | Validator that produces identical output for identical input with no external state, randomness, or LLM dependency. |
| Semantic reviewer       | Review check that evaluates quality/appropriateness beyond structural completeness. May produce varying output.     |
| Sidecar artifact        | `uiux/` directory and its contents, introduced in v1.7.3, containing strategy/scoring/comparison/anchor files.      |
| UI-bearing              | A project or pack that contains UI elements (HTML mocks, `<style>` tags, Mermaid screen flows, screen contracts).   |
| Stale asset             | A sidecar artifact whose template version is older than the current QFAI version's template.                        |
| Migration guidance      | Step-by-step instructions provided by the validator to upgrade legacy projects to current sidecar structure.        |
| Hard gate               | A validation check that blocks progression (emits `error` severity). UIX-VAL only.                                  |
| Soft gate               | A validation check that warns but does not block (emits `warning` severity). Migration checks default to this.      |
| Actionable error        | An error that includes rule ID, file path, description, and a concrete fix suggestion.                              |
| Verify-pack             | End-to-end test that validates the full artifact lifecycle from creation through validation.                        |
| Fixture                 | A test input artifact (pass or fail) used to verify a specific validator rule.                                      |
| Warning-error ratchet   | A phased enforcement strategy: start with warnings, escalate to errors after adoption period.                       |
| Scoring axes            | Evaluation dimensions used in UI/UX option comparison (e.g., usability, accessibility, performance).                |
| Aggregate scoring       | Combined scoring across all axes with weights, normalization, and threshold.                                        |
| Screen contract         | A structured definition of a UI screen including states, outcomes, and transitions.                                 |
| Generic fallback        | A design choice that uses a non-specific, template-like approach instead of a product-tailored solution.            |
| Trend translation       | The mapping from a design trend reference to its application in the specific product context.                       |
| Prototyping mode        | Declaration of whether a spec is in `interactive` or `skeleton` mode, affecting evidence requirements.              |
