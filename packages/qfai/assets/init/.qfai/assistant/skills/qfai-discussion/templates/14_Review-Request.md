# 14 Review Request

## Scope

- scope: `discussion-YYYYMMDDhhmmssSSS`
- layer: `discussion`
- review-pack: `review-YYYYMMDDhhmmssSSS`

## Target Files

- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/01_Context.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/02_Inception-Deck.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/03_Story-Workshop.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/04_Sources.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/05_Scope.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/06_REQ.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/07_NFR.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/08_Glossary.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/09_Constraints.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/10_Policy.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/11_OQ-Register.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/13_Deferred.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/14_Review-Request.md`
- `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/99_delta.md`

## Review Focus

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only
- HTML+CSS screen mock is usable for UI alignment when UI requirements exist
  - If UI requirements exist and no screen mock is provided, request changes
- OQ register exit condition (open count = 0)
- Deferred items have full metadata

## Design Direction Decisions

<!-- Required for UI-bearing packs. Populated from DDS in 03_Story-Workshop.md. -->

- Anchor screen: [Selected option reference]
- Rejection rationale: [Why other options were not selected]
- Adopted competitive references: [Key references adopted from 04_Sources.md]

## Sidecar Artifact Review Scope

<!-- Required for UI-bearing packs. Reviews uiux/ sidecar artifacts. -->

- Verify all 11 uiux/ sidecar files are present (when UI-bearing)
- Verify uiux/10_strategy.md YAML schema conforms to version `"0.1"`
- Verify scoring axes have evaluation criteria and measurement approaches
- Verify option comparison covers 2+ options against all scoring axes
- Verify anchor screen selection references a compared option
- Verify screen contracts define all 4 required states (empty/loading/error/populated)

## Required Reviewers

- Resolve reviewers from `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- Always run reviewers listed in `profiles.<routing_profile>.always_required` in `review-profiles.yml`.
- Add `architecture-reviewer` only when architecture-affecting decisions exist.
- Add `product-surface-reviewer` only when the pack is UI-bearing.
- Allowed verdicts: `PASS`, `FAIL`.

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
